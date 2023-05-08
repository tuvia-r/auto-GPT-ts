import { URL } from 'url'


export function extractHyperlinks(linkElements: any[], baseUrl: string): string[] {
    const links = linkElements.map(link => {
        const linkText = link.innerText;
        const linkUrl = new URL(link.getAttribute('href') ?? '', baseUrl).toString();
        return [linkText, linkUrl] as [string, string];
    })
    return formatHyperlinks(links);
}

export function formatHyperlinks(hyperlinks: [string, string][]): string[] {
    return hyperlinks.map(([linkText, linkUrl]) => `${linkText} (${linkUrl})`);
}