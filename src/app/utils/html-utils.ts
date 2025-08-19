export function htmlToText(html: string): string {
    return html
        // First, handle <a> tags to preserve the URL
        .replace(/<a\s+(?:[^>]*?\s+)?href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, '$3 ($2)')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p\s*[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<div\s*[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<h1\s*[^>]*>/gi, '\n# ')
        .replace(/<h2\s*[^>]*>/gi, '\n## ')
        .replace(/<h3\s*[^>]*>/gi, '\n### ')
        .replace(/<h4\s*[^>]*>/gi, '\n#### ')
        .replace(/<h5\s*[^>]*>/gi, '\n##### ')
        .replace(/<h6\s*[^>]*>/gi, '\n###### ')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<ul\s*[^>]*>([\s\S]*?)<\/ul>/gi, (_, content: string) => {
            return content.replace(/<li\s*[^>]*>([\s\S]*?)<\/li>/gi, (_, liContent: string) => {
                return '\n• ' + liContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            });
        })
        .replace(/<ol\s*[^>]*>([\s\S]*?)<\/ol>/gi, (_, content: string) => {
            let counter = 1;
            return content.replace(/<li\s*[^>]*>([\s\S]*?)<\/li>/gi, (_, liContent: string) => {
                return '\n' + (counter++) + '. ' + liContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            });
        })
        .replace(/<li\s*[^>]*>/gi, '')
        .replace(/<\/li>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
}