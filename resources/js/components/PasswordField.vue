<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    EFF_LARGE_WORDLIST, PASSPHRASE_WORDS, PASSWORD_ALPHABET, PASSWORD_CHARS,
    estimateBits, generatedBits, randomChars, randomPassphrase,
} from '@/crypto';
import { de } from '@/lang/de';

defineProps<{ id: string; label: string; hint?: string; generator?: boolean; autocomplete?: string; invalid?: boolean; describedby?: string }>();
const model = defineModel<string>({ required: true });
const source = defineModel<'typed' | 'words' | 'chars'>('source', { default: 'typed' });
const visible = ref(false);

const bits = computed(() => {
    if (model.value.length === 0) return 0;
    if (source.value === 'words') return generatedBits(EFF_LARGE_WORDLIST.length, PASSPHRASE_WORDS);
    if (source.value === 'chars') return generatedBits(PASSWORD_ALPHABET.length, PASSWORD_CHARS);
    return estimateBits(model.value);
});
const percent = computed(() => Math.min(100, (bits.value / 128) * 100));

function roll(kind: 'words' | 'chars') {
    model.value = kind === 'words' ? randomPassphrase(EFF_LARGE_WORDLIST) : randomChars();
    source.value = kind;
    visible.value = true;
}
function onInput(event: Event) {
    model.value = (event.target as HTMLInputElement).value;
    source.value = 'typed';
}
</script>

<template>
    <div class="flex flex-col gap-2">
        <label :for="id" class="text-sm font-medium">{{ label }}</label>
        <div class="flex gap-2">
            <input
                :id="id"
                :value="model"
                :type="visible ? 'text' : 'password'"
                :autocomplete="autocomplete ?? 'off'"
                :aria-invalid="invalid || undefined"
                :aria-describedby="describedby"
                spellcheck="false"
                autocapitalize="off"
                class="min-h-11 min-w-0 flex-1 rounded-lg border border-caption bg-input px-3 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                @input="onInput"
            />
            <button type="button" class="min-h-11 rounded-lg border border-caption px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" :aria-pressed="visible" @click="visible = !visible">
                {{ visible ? de.create.hide : de.create.show }}
            </button>
        </div>
        <div v-if="generator" class="flex flex-wrap gap-2">
            <button type="button" class="min-h-10 rounded-lg border border-caption px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" data-testid="dice-words" @click="roll('words')">🎲 {{ de.create.diceWords }}</button>
            <button type="button" class="min-h-10 rounded-lg border border-caption px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" data-testid="dice-chars" @click="roll('chars')">🎲 {{ de.create.diceChars }}</button>
        </div>
        <div v-if="generator" class="flex flex-col gap-1" data-testid="strength">
            <div class="flex items-center justify-between text-xs">
                <span class="font-medium">{{ de.strength.label }}</span>
                <span v-if="model.length" class="tabular-nums">{{ de.strength.bits(bits) }} · {{ source === 'typed' ? de.strength.estimate : de.strength.exact }}</span>
                <span v-else class="text-muted-foreground">{{ de.strength.none }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-surface-sunken" role="presentation">
                <div class="h-full rounded-full bg-foreground transition-[width]" :style="{ width: `${percent}%` }" />
            </div>
        </div>
        <p v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
    </div>
</template>
