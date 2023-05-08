import {encode} from 'gpt-3-encoder'


interface Message {
  role: string,
  content: string
}

export function countMessageTokens(
  messages: Message[],
  model: string = 'gpt-3.5-turbo-0301'
): number {
    //TODO: find replacement for encoder by model
//   let encoding
//   try {
//     const encoder = openai.
//     encoding = tiktok.encodingForModel(model)
//   } catch (error) {
//     console.warn(`Warning: model not found. Using cl100k_base encoding.`)
//     encoding = tiktok.getEncoding('cl100k_base')
//   }
  
//   if (model === 'gpt-3.5-turbo') {
//     // !Note: gpt-3.5-turbo may change over time.
//     // Returning num tokens assuming gpt-3.5-turbo-0301.")
//     return count_message_tokens(messages, model = 'gpt-3.5-turbo-0301')
//   } else if (model === 'gpt-4') {
//     // !Note: gpt-4 may change over time. Returning num tokens assuming gpt-4-0314.")
//     return count_message_tokens(messages, model = 'gpt-4-0314')
//   } else if (model === 'gpt-3.5-turbo-0301') {
    const tokensPerMessage = 4 // every message follows {role/name}\n{content}\n
    const tokensPerName = -1 // if there's a name, the role is omitted
    let numTokens = 0
    for (const message of messages) {
      numTokens += tokensPerMessage
      for (const [key, value] of Object.entries(message)) {
        numTokens += encode(value).length
        if (key === 'name') {
          numTokens += tokensPerName
        }
      }
    }
    numTokens += 3 // every reply is primed with assistant
    return numTokens * 2
//   } else {
//     throw new Error(`num_tokens_from_messages() is not implemented for model ${model}.\nSee https://github.com/openai/openai-python/blob/main/chatml.md for information on how messages are converted to tokens.`)
//   }
}

export function countStringTokens(string: string, modelName: string): number {
//   const encoding = tiktok.encodingForModel(modelName) TODO: find replacement
  return encode(string).length
}
