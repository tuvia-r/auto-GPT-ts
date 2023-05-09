# auto-GPT-ts
my take of auto-GPT in typescript


# To Be Added / Fixed

* More memory options
* Text to speech
* Plugins support
* Add commands
* Add a general tokenizer
* Improve user interface

# How to run:

* install node
* first create a .env file
* install tha package :
```sh
$ npm i
```

* start the program:
```sh
$ npm run start
```
  or:
```sh
$ npm run start:continuous
```
for continues mode.

## Install as a package:

```sh
$ npm i auto-gpt-ts
```

```typescript
import { startCli } from 'auto-gpt-ts';
startCli();
```

### Customizations

```typescript
import { Agent } from 'auto-gpt-ts'

export class MyAgent extends Agent {
    protected onInteractionLoopEnd(): Promise<void> {
        
    }

    protected onInteractionLoopStart(): Promise<void> {
    }

    protected shouldContinue(): Promise<boolean> {
        
    }
}
```

register custom commands:

```typescript

import { CommandDecorator } from 'auto-gpt-ts';


@CommandDecorator({
    name: 'myCommandFunction',
    description: 'my command description',
    signature: '"myParam": string',
    register: true
})
export class MyCommand {
    static async myCommandFunction(myParam: string) {
        console.log(myParam);
    }
}


```


create custom prompt generator:

```typescript

import { PromptGenerator } from 'auto-gpt-ts';


export class MyPromptGenerator extends PromptGenerator {
    protected async generatePrompt(): Promise<string> {
        return 'my prompt'
    }
}

```


a custom permanent memory provider:

```typescript

import { MemoryProvider, Singleton, addMemoryTypes } from 'auto-gpt-ts';

@Singleton
export class MyMemoryProvider extends MemoryProvider {
    static memoryName: string = 'myMemoryName';
    /// implement abstract methods
}

addMemoryTypes(MyMemoryProvider);

```

and more.


to configure th config, you can create use the singleton Config class:

```typescript

import { Config } from 'auto-gpt-ts';


const config = new Config();

config.openaiApiKey = 'my key';

```


### Start a Agent

you can see an example (here)[src/main.ts]






