<script lang="ts">
import Form from "$lib/domain/soundSet/ui/Form.svelte";
import type {PageProps} from "./$types";

let { data }: PageProps = $props();
</script>

<Form set={data.set} open/>