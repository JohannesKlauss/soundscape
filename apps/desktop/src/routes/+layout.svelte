<script lang="ts">
import { StateFlags, saveWindowState } from '@tauri-apps/plugin-window-state'
import { Tooltip } from 'bits-ui'
import { onMount } from 'svelte'
import { Toaster } from 'svelte-sonner'
import '../app.css'
import {Loader2} from "@lucide/svelte";
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import AlertDialog from '$lib/components/AlertDialog.svelte'
import DependencyIndicator from '$lib/domain/library/ui/DependencyIndicator.svelte'
import LibrarySheet from '$lib/domain/library/ui/LibrarySheet.svelte'
import SoundPadPanel from '$lib/domain/soundPad/ui/SoundPadPanel.svelte'
import SoundSetTile from '$lib/domain/soundSet/ui/SoundSetTile.svelte'
import AudioContext from '$lib/engine/ui/AudioContext.svelte'
import GlobalControl from '$lib/engine/ui/GlobalControl.svelte'

interface Props {
  children: import('svelte').Snippet
}

let { children }: Props = $props()

let isDownloadingNewVersion = $state(false)
let isNewVersionReady = $state(false)

onMount(() => {
  check().then(async update => {
    if (update) {
      isDownloadingNewVersion = true

      await update.downloadAndInstall()

      isDownloadingNewVersion = false
      isNewVersionReady = true
    }
  })

  function onBeforeUnload() {
    saveWindowState(StateFlags.ALL)
  }

  window.addEventListener('beforeunload', onBeforeUnload)

  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload)
  }
})
</script>

<Tooltip.Provider delayDuration={0}>
    <div class="flex flex-col h-screen app-backdrop">
        <div class="flex-center justify-between px-8 bg-base-300/80 border-b border-base-content/10 ">
            <div class="flex items-center p-2 pl-0">
                <h1 class="text-5xl p-1">SØUND/SCAPE<sup class="text-xl">______vØ.9.3</sup></h1>
            </div>

            <div class="flex items-center gap-4">
                {#if isDownloadingNewVersion}
                    <div class="flex items-center gap-2 text-xs text-base-content/60">
                        <Loader2 class="size-4 animate-spin" />
                        <span>Downloading new version...</span>
                    </div>
                {:else if isNewVersionReady}
                    <button type="button" class="btn btn-primary" onclick={relaunch}>
                        Update
                    </button>
                {/if}
                <DependencyIndicator/>
                <GlobalControl/>
            </div>
        </div>

        <AudioContext/>

        <div class="flex relative flex-1 min-h-0">
            <div class="flex relative flex-col basis-1/5 shrink-0 z-10 bg-base-100/90 border-r border-base-content/10">
                <SoundSetTile/>
            </div>
            <div class="grow overflow-x-hidden overflow-y-auto w-full border-r border-base-content/10 bg-base-300/80 flex flex-col">
                <div class="p-8">
                    {@render children()}
                </div>

                <div class="mt-auto">
                    <LibrarySheet/>
                </div>
            </div>
            <div class="w-160 min-h-0 bg-base-100/90">
                <SoundPadPanel/>
            </div>
        </div>
    </div>
</Tooltip.Provider>

<Toaster position="top-right" expand richColors />
<AlertDialog/>

<style>
    .app-backdrop::before {
        content: '';
        position: fixed;
        inset: 0;
        background: url('/assets/img.png') no-repeat center / cover;
        filter: blur(24px);
        z-index: -1;
    }
</style>