// import { simpleGit } from "simple-git";
// import { CommandDecorator } from "./command";



// @CommandDecorator({
//     name: 'gitAdd',
//     description: 'Add files to git',
//     signature: '"files": string'
// })
// export class GitAddCommand {
//     static async gitAdd(files: string) {
//         const git = simpleGit();
//         const res = await git.add(files);
//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'gitCommit',
//     description: 'Commit files to git',
//     signature: '"message": "<message>"'
// })
// export class GitCommitCommand {
//     static async gitCommit(message: string) {
//         const git = simpleGit();
//         const res = await git.commit(message);
//         return res;
//     }
// }

// @CommandDecorator({
//     name: 'gitPush',
//     description: 'Push files to git',
//     signature: '"remote": "<remote>", "branch": "<branch>"'
// })
// export class GitPushCommand {
//     static async gitPush(remote: string, branch: string) {
//         const git = simpleGit();
//         const res = await git.push(remote, branch);
//         return res;
//     }
// }

// @CommandDecorator({
//     name: 'gitPull',
//     description: 'Pull files from git',
//     signature: '"remote": "<remote>", "branch": "<branch>"'
// })
// export class GitPullCommand {
//     static async gitPull(remote: string, branch: string) {
//         const git = simpleGit();
//         const res = await git.pull(remote, branch);
//         return res;
//     }
// }

// @CommandDecorator({
//     name: 'gitStatus',
//     description: 'Get git status',
//     signature: ''

// })
// export class GitStatusCommand {
//     static async gitStatus() {
//         const git = simpleGit();
//         const res = await git.status();
//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'gitLog',
//     description: 'Get git log',
//     signature: '"limit": "<limit>"'
// })
// export class GitLogCommand {
//     static async gitLog(limit: number) {
//         const git = simpleGit();
//         const res = await git.log({ limit });
//         return res;
//     }
// }

// @CommandDecorator({
//     name: 'gitDiff',
//     description: 'Get git diff',
//     signature: '"options": "<options>"'
// })
// export class GitDiffCommand {
//     static async gitDiff(options: any) {
//         const git = simpleGit();
//         const res = await git.diff(options);
//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'gitShow',
//     description: 'Get git show',
//     signature: '"options": "<options>"'
// })
// export class GitShowCommand {
//     static async gitShow(options: any) {
//         const git = simpleGit();
//         const res = await git.show(options);
//         return res;
//     }

// }



// @CommandDecorator({
//     name: 'gitBranch',
//     description: 'Get git branch',
//     signature: '"options": "<options>"'
// })
// export class GitBranchCommand {
//     static async gitBranch(options: any) {
//         const git = simpleGit();
//         const res = await git.branch(options);
//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'gitCheckout',
//     description: 'Checkout git branch',
//     signature: '"branch": "<branch>"'
// })
// export class GitCheckoutCommand {
//     static async gitCheckout(branch: string) {
//         const git = simpleGit();
//         const res = await git.checkout(branch);
//         return res;
//     }

// }


// @CommandDecorator({
//     name: 'gitListConfig',
//     description: 'List git config',
//     signature: '"options": "<options>"'
// })
// export class GitPullRequestCommand {
//     static async gitListConfig(options: any) {
//         const git = simpleGit();
//         const res = await git.listConfig(options);
//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'gitClone',
//     description: 'Clone git repository',
//     signature: '"repo": "<repo>", "local": "<local>"'
// })
// export class GitCloneCommand {
//     static async gitClone(repo: string, local: string) {
//         const git = simpleGit();
//         const res = await git.clone(repo, local);
//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'gitFetch',
//     description: 'Fetch git repository',
//     signature: '"remote": "<remote>", "branch": "<branch>"'
// })
// export class GitFetchCommand {
//     static async gitFetch(remote: string, branch: string) {
//         const git = simpleGit();
//         const res = await git.fetch(remote, branch);
//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'gitInit',
//     description: 'Init git repository',
//     signature: '"bare": "<bare>"'
// })
// export class GitInitCommand {
//     static async gitInit(bare: boolean) {
//         const git = simpleGit();
//         const res = await git.init(bare);
//         return res;
//     }
// }


// @CommandDecorator({
//     name: 'gitConfigSet',
//     description: 'Set git config',
//     signature: '"key": "<key>", "value": "<value>"'
// })
// export class GitConfigSetCommand {
//     static async gitConfigSet(key: string, value: string) {
//         const git = simpleGit();
//         const res = await git.raw(['config', key, value]);
//         return res;
//     }
// }



