import { defineConfig } from 'vitepress'

export default defineConfig({
    title: "API360",
    description: "Comprehensive Desktop API Client",
    themeConfig: {
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Guide', link: '/guide/getting-started' }
        ],

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    { text: 'Getting Started', link: '/guide/getting-started' }
                ]
            },
            {
                text: 'Core Concepts',
                items: [
                    { text: 'HTTP Client', link: '/guide/core-concepts/http-client' },
                    { text: 'Collections & History', link: '/guide/core-concepts/collections-history' },
                    { text: 'Environments', link: '/guide/core-concepts/environments' },
                    { text: 'Workspaces', link: '/guide/core-concepts/workspaces' }
                ]
            },
            {
                text: 'Advanced',
                items: [
                    { text: 'GraphQL', link: '/guide/advanced/graphql' },
                    { text: 'WebSockets', link: '/guide/advanced/websockets' },
                    { text: 'Contract Testing', link: '/guide/advanced/contract-testing' },
                    { text: 'Scripting Engine', link: '/guide/advanced/scripting-engine' }
                ]
            },
            {
                text: 'Platforms',
                items: [
                    { text: 'Desktop App (Tauri)', link: '/guide/platforms/desktop-app' },
                    { text: 'VS Code Extension', link: '/guide/platforms/vscode-extension' }
                ]
            }
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/binod12/api360-studio' }
        ]
    }
})
