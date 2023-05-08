import * as DDG from 'duck-duck-scrape';
import { CommandDecorator } from './command';



@CommandDecorator({
    name: 'googleSearch',
    description: 'Google Search',
    signature: '"query": string, "maxResults": number',
    aliases: ['google', 'search']
})
export class GoogleSearchCommand {
    static async googleSearch(query: string, maxResults: number) {
        const res = await DDG.search(query, {});
        return res.results.slice(0, maxResults);
    }
}