<script lang="ts">
    import { Toaster } from 'svelte-sonner'
    import { Tooltip } from "bits-ui";
    import '../app.css'
    import SoundSetTile from "$lib/domain/soundSet/ui/SoundSetTile.svelte";
    import SoundSampleSheet from "$lib/domain/soundSample/ui/SoundSampleSheet.svelte";
    import AudioContext from "$lib/engine/ui/AudioContext.svelte";
    import SoundPadPanel from "$lib/domain/soundPad/ui/SoundPadPanel.svelte";
    import AlertDialog from "$lib/components/AlertDialog.svelte";
    import GlobalControl from "$lib/engine/ui/GlobalControl.svelte";

    interface Props {
      children: import('svelte').Snippet
    }

    let {children}: Props = $props()
</script>

<Tooltip.Provider delayDuration={0}>
    <div class="flex flex-col h-screen">
        <div class="flex-center justify-between header px-8">
            <div class="h-32 flex items-center p-8 pl-0 border-b border-base-content/10">
                <h1 class="text-5xl bg-base-100/40 p-1">SØUND/SCAPE<sup class="text-xl">______vØ.1 a1pha</sup></h1>
            </div>

            <GlobalControl/>
        </div>

        <AudioContext/>

        <div class="flex relative flex-1 min-h-0">
            <div class="flex relative flex-col basis-1/5 shrink-0 z-10 bg-base-100 border-r border-base-content/10">
                <SoundSetTile/>
            </div>
            <div class="grow overflow-x-hidden overflow-y-auto w-full border-r border-base-content/10 bg-base-300 flex flex-col">
                <div class="p-8">
                    {@render children()}
                </div>

                <div class="mt-auto">
                    <SoundSampleSheet/>
                </div>
            </div>
            <div class="w-160 min-h-0">
                <SoundPadPanel/>
            </div>
        </div>
    </div>
</Tooltip.Provider>

<Toaster position="top-right" expand richColors />
<AlertDialog/>

<style>
    .header {
        background: url('/assets/header.png') no-repeat center;
    }
</style>