import * as crypto from "crypto";
import * as fs from "fs";
import { Config } from "../config/config";
import { getLogger } from '../logging';
import chardet from "chardet";
import * as iconv from "iconv-lite";
import { CommandDecorator } from "./command";
import * as path from "path";
import axios from "axios";
import { ExecuteShell } from "./run-code";

const CFG = new Config();
const logger = getLogger("file-operations");

export type Operation = "write" | "append" | "delete";

function text_checksum(text: string): string {
  // Get the hex checksum for the given text
  return crypto.createHash("md5").update(text).digest("hex");
}

function* operations_from_log(
  log_path: string
): Generator<[string, string, string | null]> {
  let log;
  try {
    log = fs.readFileSync(log_path, "utf-8");
  } catch (err) {
    return;
  }

  for (let line of log.split("\n")) {
    line = line.replace("File Operation Logger", "").trim();
    if (!line) {
      continue;
    }

    const [operation, tail] = line.split(": ", 2);
    if (operation === "write" || operation === "append") {
      let [path, checksum] = tail.split(" #", 2).map((x) => x.trim());
      if (!checksum) {
        checksum = null;
      }
      yield [operation, path, checksum];
    } else if (operation === "delete") {
      yield [operation, tail.trim(), null];
    }
  }
}

function file_operations_state(log_path: string): { [key: string]: string } {
  const state: { [key: string]: string } = {};
  for (const [operation, path, checksum] of operations_from_log(log_path)) {
    if (operation === "write" || operation === "append") {
      state[path] = checksum ?? "";
    } else if (operation === "delete") {
      delete state[path];
    }
  }
  return state;
}

function is_duplicate_operation(
  operation: Operation,
  filename: string,
  checksum: string | null = null
): boolean {
  const state = file_operations_state(CFG.fileLoggerPath);
  if (operation === "delete" && !(filename in state)) {
    return true;
  } else if (operation === "write" && state[filename] === (checksum ?? "")) {
    return true;
  }
  return false;
}

// function log_operation(
//   operation: string,
//   filename: string,
//   checksum: string | null = null
// ): void {
//   let log_entry = `${operation}: ${filename}`;
//   if (checksum !== null) {
//     log_entry += ` #${checksum}`;
//   }
//   logger.debug(`Logging file operation: ${log_entry}`);
//   AppendToFile.appendToFile(CFG.fileLoggerPath, `${log_entry}\n`, false);
// }

function* split_file(
  content: string,
  max_length: number = 4000,
  overlap: number = 0
): Generator<string> {
  let start = 0;
  const content_length = content.length;

  while (start < content_length) {
    const end = start + max_length;
    let chunk;
    if (end + overlap < content_length) {
      chunk = content.substring(start, end + overlap - 1);
    } else {
      chunk = content.substring(start, content_length);

      // Account for the case where the last chunk is shorter than the overlap, so it has already been consumed
      if (chunk.length <= overlap) {
        break;
      }
    }

    yield chunk;
    start += max_length - overlap;
  }
}

function readable_file_size(size: number, decimal_places: number = 2): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(decimal_places)} ${units[unitIndex]}`;
}

// @CommandDecorator({
//   name: "readFile",
//   description: "Read File",
//   signature: '"filename": string',
// })
// export class ReadFile {
//   static readFile(filename: string): string {
//     if (filename.includes("<filename>")) {
//       return "Error: Please specify a filename.";
//     }
//     try {
//       const buffer = fs.readFileSync(filename);
//       const encoding = chardet.detect(buffer) ?? "utf-8";
//       const contents = iconv.decode(buffer, encoding);
//       logger.debug(`Read file '${filename}' with encoding '${encoding}'`);
//       return contents;
//     } catch (err) {
//       return `Error: ${err}`;
//     }
//   }
// }

@CommandDecorator({
  name: "createFile",
  description: "Create a File",
  signature: '"filename": string, "text": string',
  aliases: ["writeFile"],
})
export class CreateFile {
  static createFile(filename: string, text: string): string {
    if (filename.includes("<filename>")) {
      return "Error: Please specify a filename.";
    }
    if (text === "<text>") {
      return "Error: Please specify text to write.";
    }
    const checksum = text_checksum(text);
    if (is_duplicate_operation("write", filename, checksum)) {
      return "Error: File has already been updated.";
    }
    try {
      // filename = path.join(path.dirname(filename), 'scripts', path.basename(filename));
      const directory = path.dirname(filename);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(filename, text, "utf-8");
      // log_operation("write", filename, checksum);
      return `File ${filename} written successfully.`;
    } catch (err) {
      return `Error: ${err}`;
    }
  }
}

@CommandDecorator({
  name: "appendToFile",
  description: "Append to File",
  signature: '"filename": string, "text": string',
})
export class AppendToFile {
  static appendToFile(
    filename: string,
    text: string,
    should_log: boolean = true
  ): string {
    try {
      if (filename.includes("<filename>")) {
        return `Error: Please provide a valid filename.`;
      }
      const directory = path.dirname(filename);
      fs.mkdirSync(directory, { recursive: true });
      fs.appendFileSync(filename, text, "utf-8");

      if (should_log) {
        const content = fs.readFileSync(filename, "utf-8");
        const checksum = text_checksum(content);
        // log_operation("append", filename, checksum);
      }

      return "Text appended successfully.";
    } catch (err) {
      return `Error: ${err}`;
    }
  }
}

// @CommandDecorator({
//   name: "ls",
//   description: "List Files",
//   signature: "",
// })
// export class ListFiles {
//   static ls() {
//     try {
//       return ExecuteShell.executeShellCommandLine("ls -la");
//     } catch (err) {
//       return `Error: ${err}`;
//     }
//   }
// }

@CommandDecorator({
  name: "downloadFile",
  description: "Download File",
  signature: '"url":string, "destinationPath": string',
})
export class DownloadFile {
  static async downloadFile(
    url: string,
    destinationPath: string
  ): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const data = response.data as Buffer;
      fs.writeFileSync(destinationPath, data);
      return `Successfully downloaded and locally stored file: "${path.basename(
        destinationPath
      )}.${path.extname(destinationPath)}"! (Size: ${readable_file_size(
        Buffer.byteLength(data)
      )})`;
    } catch (err) {
      return `Error: ${err}`;
    }
  }
}
