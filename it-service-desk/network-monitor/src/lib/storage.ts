/**
 * Local Storage persistence for network nodes configuration
 */

import { NetworkNode } from './monitor'

const STORAGE_KEY = 'jbmarks-network-nodes'

export function loadNodes(): NetworkNode[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch { /* ignore */ }
  
  // Default demo nodes
  return [
    {
      id: '1',
      name: 'SDiM Portal',
      url: 'https://jbmarks.sdinmotion.co.za',
      location: 'Azure - Production',
      type: 'website',
    },
    {
      id: '2',
      name: 'Dev Server',
      url: 'http://102.133.224.173',
      location: 'Azure - Dev VM',
      type: 'server',
    },
    {
      id: '3',
      name: 'Prod Server',
      url: 'http://20.87.213.228',
      location: 'Azure - Prod VM',
      type: 'server',
    },
    {
      id: '4',
      name: 'IT Helpdesk Portal',
      url: 'https://zealous-sand-0050fce00.7.azurestaticapps.net',
      location: 'Azure Static Web App',
      type: 'website',
    },
    {
      id: '5',
      name: 'IT Support Dashboard',
      url: 'https://black-water-07331b400.7.azurestaticapps.net',
      location: 'Azure Static Web App',
      type: 'website',
    },
    {
      id: '6',
      name: 'Reports Dashboard',
      url: 'https://polite-tree-08ad84b00.7.azurestaticapps.net',
      location: 'Azure Static Web App',
      type: 'website',
    },
  ]
}

export function saveNodes(nodes: NetworkNode[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes))
  } catch { /* ignore */ }
}
