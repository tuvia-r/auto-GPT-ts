import * as ora from 'ora';

export async function withSpinner<T>(message: string, callback: () => Promise<T>): Promise<T> {
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
  }
