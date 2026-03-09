<script lang="ts">
import { AlertCircle, Loader2, CheckCircle } from '@lucide/svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { ytDlpState, ensureDependencies } from '$lib/domain/library/ui/ytDlpState.svelte'
import {onMount} from "svelte";

onMount(() => {
  ensureDependencies()
})
</script>

{#if ytDlpState.depsDownloading}
    <div class="flex items-center gap-2 text-xs text-base-content/60">
        <Loader2 class="size-4 animate-spin" />
        <span>Downloading conversion tools...</span>
    </div>
{:else if ytDlpState.ready}
    <div class="flex items-center gap-2 text-xs text-base-content/60">
        <CheckCircle class="size-4 text-success" />
        <span>Audio Loader ready</span>
    </div>
{:else if ytDlpState.depsError}
    <Tooltip triggerProps={{onclick: () => navigator.clipboard.writeText(ytDlpState.depsError ?? '')}}>
        {#snippet trigger()}
            <div class="flex items-center gap-1 text-xs text-error cursor-help">
                <AlertCircle class="size-4" />
                <span>Tools error</span>
            </div>
        {/snippet}
        {ytDlpState.depsError}
    </Tooltip>
{/if}
