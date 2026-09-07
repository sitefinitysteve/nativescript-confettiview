module.exports = {
  message: 'nativescript-confettiview ~ 🎉 Choose a command to start...',
  pageSize: 32,
  scripts: {
    default: 'nps-i',
    nx: {
      script: 'nx',
      description: 'Execute any command with the Nx cli',
    },
    format: {
      script: 'nx format:write',
      description: 'Format source code of the entire workspace (auto-run on precommit hook)',
    },
    '🔧': {
      script: `npx cowsay "Run the demo to see confetti 🎊"`,
      description: '_____________  Demo app  _____________',
    },
    apps: {
      demo: {
        clean: {
          script: 'nx clean demo',
          description: '⚆  Clean  🧹',
        },
        ios: {
          script: 'nx debug demo ios',
          description: '⚆  Run iOS  ',
        },
        android: {
          script: 'nx debug demo android',
          description: '⚆  Run Android  🤖',
        },
      },
    },
    '📦': {
      script: `npx cowsay "Build output always lands in dist/packages"`,
      description: '_____________  Packages  _____________',
    },
    'nativescript-confettiview': {
      build: {
        script: 'nx run nativescript-confettiview:build.all',
        description: 'Build nativescript-confettiview',
      },
    },
    'build-all': {
      script: 'nx run-many --target=build.all --all',
      description: 'Build all packages',
    },
    '⚡': {
      script: `npx cowsay "Focus only on source you care about for efficiency ⚡"`,
      description: '_____________  Focus (VS Code supported)  _____________',
    },
    focus: {
      'nativescript-confettiview': {
        script: 'nx run nativescript-confettiview:focus',
        description: 'Focus on nativescript-confettiview',
      },
      reset: {
        script: 'nx g @nativescript/plugin-tools:focus-packages',
        description: 'Reset Focus',
      },
    },
    '.....................': {
      script: `npx cowsay "That's all for now folks ~"`,
      description: '.....................',
    },
  },
};
