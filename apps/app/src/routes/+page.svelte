<script lang="ts">
  import WebSocket from '@tauri-apps/plugin-websocket';
  import { onMount } from 'svelte';

  let ws: any = null;
  let connected = $state(false);
  let serverIp = '192.168.178.170';

  async function connect() {
    try {
      ws = await WebSocket.connect(`ws://${serverIp}:8080`);

      ws.addListener((msg: any) => {
        console.log('Received from server:', msg);
      });

      connected = true;
      console.log('Connected to desktop server');
    } catch (error) {
      console.error('Connection failed:', error);
      connected = false;
    }
  }

  async function changeScene(sceneId: string) {
    if (!connected || !ws) {
      alert('Not connected to desktop');
      return;
    }

    const command = {
      action: 'changeScene',
      scene_id: sceneId,
      fade_time: 3000
    };

    try {
      await ws.send(JSON.stringify(command));
      console.log('Scene change sent:', sceneId);
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  }

  onMount(() => {
    connect()
  });
</script>

<main>
  <h1>Welcome to Tauri + Svelte</h1>

  <button class="btn btn-primary" onclick={() => changeScene('234')}>Change scene</button>
</main>
