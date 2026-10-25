import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/600-italic.css'
import '@fontsource/barlow-condensed/700-italic.css'
import '@fontsource/barlow-condensed/800-italic.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { createDataSource } from './data/index.ts'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/pages.css'
import './styles/guide.css'
import './styles/sport.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element.')

createDataSource().then((source) => {
  createRoot(container).render(
    <StrictMode>
      <App source={source} />
    </StrictMode>,
  )
})
