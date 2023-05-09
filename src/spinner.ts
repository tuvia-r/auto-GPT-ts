import ora from 'ora';
import { Logger } from './logging';

export async function withSpinner<T>(message: string, callback: () => Promise<T>): Promise<T> {

    return Logger.addTask(async () => {
      const spinner = ora({ text: message }).start();
      try {
        let res = await callback();
        spinner.succeed();
        spinner.clear();
        return res;
  
      } catch (error) {
        spinner.fail();
        throw error;
      }
    })
  }
