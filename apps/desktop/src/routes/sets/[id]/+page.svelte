<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  console.log('data', data)
</script>

<div>
    {data.set.name}
</div>