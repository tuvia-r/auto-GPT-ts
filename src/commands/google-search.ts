import * as DDG from 'duck-duck-scrape';
import { CommandDecorator } from './command';
import { getLogger } from '../logging';



@CommandDecorator({
    name: 'googleSearch',
    description: 'Google Search',
    signature: '"query": string, "maxResults": number',
    aliases: ['google', 'search']
})
export class GoogleSearchCommand {
    static logger = getLogger('GoogleSearchCommand')
    static async googleSearch(query: string, maxResults: number = 10) {
        this.logger.debug(`executing: googleSearch(${query}, ${maxResults})`)
        const res = await DDG.search(query.replace(/\ /g, '+'), {});
        return res.results.slice(0, maxResults);
    }
}