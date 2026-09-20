import * as vscode from 'vscode'
import { getWebviewHtml } from './html'
import { WebviewRouter, type RouterHost } from './rpc/router'

export const APP_PANEL_VIEW_TYPE = 'huddlellm.app'
export const BTW_PANEL_VIEW_TYPE = 'huddlellm.btw'

/**
 * The main HuddleLLM app: a webview panel in the editor area running the
 * full React app (all-in-one grid, settings, history — hash routed).
 * Multiple panels can be open at once; `active` tracks the most recently
 * focused one so commands like Quick Ask target the panel the user last used.
 */
export class AppPanel {
  private static readonly panels = new Set<AppPanel>()
  private static active: AppPanel | undefined

  /** Reveals the most recently used panel, creating one if none is open. */
  static createOrShow(context: vscode.ExtensionContext, host: RouterHost, route?: string): AppPanel {
    const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One
    const existing = AppPanel.active
    if (existing) {
      existing.panel.reveal(column)
      if (route) {
        existing.router.post({ type: 'route.navigate', route })
      }
      return existing
    }
    return AppPanel.createNew(context, host, route)
  }

  /** Always opens an additional panel, regardless of how many are open. */
  static createNew(context: vscode.ExtensionContext, host: RouterHost, route?: string): AppPanel {
    const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One
    const panel = vscode.window.createWebviewPanel(APP_PANEL_VIEW_TYPE, 'HuddleLLM', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
    })
    return AppPanel.restore(context, host, panel, route)
  }

  static restore(
    context: vscode.ExtensionContext,
    host: RouterHost,
    panel: vscode.WebviewPanel,
    route?: string,
  ): AppPanel {
    const instance = new AppPanel(context, host, panel, route)
    AppPanel.panels.add(instance)
    AppPanel.active = instance
    return instance
  }

  static get instance(): AppPanel | undefined {
    return AppPanel.active
  }

  static broadcastAll(msg: Parameters<WebviewRouter['post']>[0]): void {
    for (const panel of AppPanel.panels) {
      panel.broadcast(msg)
    }
  }

  readonly router: WebviewRouter

  private constructor(
    context: vscode.ExtensionContext,
    host: RouterHost,
    private readonly panel: vscode.WebviewPanel,
    initialRoute?: string,
  ) {
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
    }
    this.router = new WebviewRouter(
      this.panel.webview,
      'app',
      {
        ...host,
        takePendingQuery: host.takePendingQuery.bind(host),
        openPanel: host.openPanel?.bind(host),
        onRouteChanged: (route) => {
          // persisted for WebviewPanelSerializer restore
          void context.globalState.update('huddlellm.lastRoute', route)
        },
      },
      initialRoute,
    )
    this.panel.webview.html = getWebviewHtml(this.panel.webview, context.extensionUri)
    this.panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        AppPanel.active = this
      }
    })
    this.panel.onDidDispose(() => {
      this.router.dispose()
      AppPanel.panels.delete(this)
      if (AppPanel.active === this) {
        AppPanel.active = AppPanel.panels.values().next().value
      }
    })
  }

  postQuickAsk(query: string): void {
    this.router.post({ type: 'quick-ask', query })
    this.panel.reveal()
  }

  broadcast(msg: Parameters<WebviewRouter['post']>[0]): void {
    this.router.post(msg)
  }
}

/**
 * Auxiliary panel for the BTW ("By The Way") standalone chat — the Chrome
 * version opened a popup window; here it's a second webview panel.
 */
export function openAuxPanel(context: vscode.ExtensionContext, host: RouterHost, route: string): void {
  const panel = vscode.window.createWebviewPanel(BTW_PANEL_VIEW_TYPE, 'HuddleLLM — BTW', vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
  })
  const router = new WebviewRouter(panel.webview, 'app', host, route)
  panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri)
  panel.onDidDispose(() => router.dispose())
}
