import ora from 'ora';
import { Logger } from './logging';

export async function withSpinner<T>(message: string, callback: () => Promise<T>): Promise<T> {

    return Logger.addTask(async () => {
      const spinner = ora({ text: message }).start();
      try {
        let res = await callback();
        return res;
  
      } catch (error) {
        throw error;
      }
      finally {
        spinner.stop();
        spinner.clear();
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    })
  }
