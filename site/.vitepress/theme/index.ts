import DefaultTheme from 'vitepress/theme'
import './custom.css'
import Demo from './components/Demo.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // keep DefaultTheme enhanceApp if present
    if (typeof DefaultTheme.enhanceApp === 'function') {
      DefaultTheme.enhanceApp({ app } as any)
    }
    app.component('Demo', Demo)
  }
}
