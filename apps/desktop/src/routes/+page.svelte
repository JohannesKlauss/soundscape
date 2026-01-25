<script lang="ts">
  import '../app.css'
  import {onMount} from "svelte";
  import { listen } from '@tauri-apps/api/event';
  import { invoke } from "@tauri-apps/api/core";

  let serverStatus = $state('Not Started')
  let sceneId = $state(0)

  onMount(async () => {
    // Start WebSocket server
    try {
      const result = await invoke('start_websocket_server');
      serverStatus = result as string;
    } catch (error) {
      console.error('Failed to start server:', error);
    }

    // Listen for scene changes from mobile
    await listen('scene-change', (event) => {
      const cmd = event.payload as any;
      console.log('Scene change command:', cmd);

      if (cmd.action === 'changeScene' && cmd.scene_id) {
        sceneId = cmd.scene_id
      }
    });
  });
</script>

<div>{serverStatus}</div>