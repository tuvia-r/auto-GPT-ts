// import axios from "axios";
// import { Config } from "../config/config";
// import { TextDecoder } from "util";
// import * as fs from "fs";
// import { CommandDecorator } from "./command";

// const CFG = new Config();

// @CommandDecorator({
//   name: "readAudioFromFile",
//   description: "Convert Audio to text",
//   signature: '"filename": "<filename>"',
//   enabled: !!CFG.huggingface_audio_to_text_model,
//   disabledReason: "Configure huggingface_audio_to_text_model",
// })
// export class AudioTextCommand {
//   static readAudioFromFile(filename: string): Promise<string> {
//     const audio = fs.readFileSync(filename, "binary");
//     return this.readAudio(Uint8Array.from(Buffer.from(audio)));
//   }

//   private static async readAudio(audio: Uint8Array): Promise<string> {
//     const model = CFG.huggingface_audio_to_text_model;
//     const api_url = `https://api-inference.huggingface.co/models/${model}`;
//     const api_token = CFG.huggingface_api_token;
//     const headers = { Authorization: `Bearer ${api_token}` };

//     if (!api_token) {
//       throw new Error(
//         "You need to set your Hugging Face API token in the config file."
//       );
//     }

//     const response = await axios.post(api_url, {
//       headers,
//       body: audio,
//     });

//     const text = JSON.parse(new TextDecoder().decode(response.data)).text;
//     return `The audio says: ${text}`;
//   }
// }
