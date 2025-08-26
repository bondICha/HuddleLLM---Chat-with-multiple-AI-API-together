import Browser from 'webextension-polyfill'

export async function requestHostPermissions(customApiConfigs: any[], customApiHost?: string): Promise<void> {
  try {
    // Request host permissions for all custom API hosts to prevent CORS issues
    if (customApiConfigs && customApiConfigs.length > 0) {
      const originsToRequest = customApiConfigs
        .map(config => config.host || customApiHost) // Use common host if specific host is empty
        .filter(host => host && host.startsWith('http')) // Filter valid http/https URLs
        .map(host => host.replace(/\/$/, '') + '/'); // Ensure trailing slash for permission matching
      const uniqueOrigins = [...new Set(originsToRequest)]; // Remove duplicates

      if (uniqueOrigins.length > 0) {
        console.log('Requesting permissions for origins:', uniqueOrigins);
        // Request permissions from the browser
        await Browser.permissions.request({ origins: uniqueOrigins });
      }
    }
  } catch (error) {
    console.error('Error requesting permissions:', error);
    // Don't throw error to prevent breaking the main operation
  }
}