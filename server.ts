import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { providerContext } from './providerContext';

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to get the list of available providers
app.get('/api/providers', (req, res) => {
  try {
    const dirs = fs.readdirSync(__dirname, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && fs.existsSync(path.join(__dirname, dirent.name, 'stream.ts')))
      .map(dirent => dirent.name);
    res.json({ providers: dirs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

// Endpoint to scrape a stream
app.get('/api/stream', async (req, res) => {
  const { provider, type, url, tmdbId } = req.query;
  
  if (!provider || typeof provider !== 'string') {
    return res.status(400).json({ error: 'Provider is required' });
  }

  const providerPath = path.join(__dirname, provider, 'stream.ts');
  if (!fs.existsSync(providerPath)) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  try {
    // Dynamically import the provider's stream module
    const streamModule = await import(`./${provider}/stream`);
    
    // Most providers export getStream or GetStream
    const getStreamFn = streamModule.getStream || streamModule.GetStream;
    
    if (!getStreamFn) {
      return res.status(500).json({ error: 'Provider does not export a valid stream function' });
    }

    // Call the scraper
    const abortController = new AbortController();
    const streams = await getStreamFn({
      link: url as string,
      type: (type as string) || 'movie',
      signal: abortController.signal,
      providerContext
    });

    res.json({ streams });
  } catch (err: any) {
    console.error(`Error executing provider stream ${provider}:`, err);
    res.status(500).json({ error: 'Failed to extract stream', details: err.message });
  }
});

// Endpoint to search for a title on a specific provider
app.get('/api/search', async (req, res) => {
  const { provider, query } = req.query;
  
  if (!provider || typeof provider !== 'string') {
    return res.status(400).json({ error: 'Provider is required' });
  }

  const postsPath = path.join(__dirname, provider, 'posts.ts');
  if (!fs.existsSync(postsPath)) {
    return res.status(404).json({ error: 'Provider does not support search (no posts.ts)' });
  }

  try {
    const postsModule = await import(`./${provider}/posts`);
    const searchFn = postsModule.getSearchPosts || postsModule.GetSearchPosts;
    
    if (!searchFn) {
      return res.status(500).json({ error: 'Provider does not export a search function' });
    }

    const abortController = new AbortController();
    const results = await searchFn({
      searchQuery: query as string,
      page: 1,
      providerValue: provider,
      signal: abortController.signal,
      providerContext
    });

    res.json({ results });
  } catch (err: any) {
    console.error(`Error executing provider search ${provider}:`, err);
    res.status(500).json({ error: 'Failed to search', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AnimaVerse Providers API running on http://localhost:${PORT}`);
});
