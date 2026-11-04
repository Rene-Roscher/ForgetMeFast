<script setup lang="ts">
import { computed, ref } from 'vue';
import Icon from '@/components/Icon.vue';
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
    <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
            <label :for="id" class="label">{{ label }}</label>
            <div class="relative">
                <input
                    :id="id"
                    :value="model"
                    :type="visible ? 'text' : 'password'"
                    :autocomplete="autocomplete ?? 'off'"
                    :aria-invalid="invalid || undefined"
                    :aria-describedby="describedby"
                    spellcheck="false"
                    autocapitalize="off"
                    class="field pr-12 font-mono text-[13px]"
                    @input="onInput"
                />
                <button type="button" class="icon-btn absolute top-1/2 right-1 -translate-y-1/2" :aria-pressed="visible" :aria-label="visible ? de.create.hide : de.create.show" :title="visible ? de.create.hide : de.create.show" @click="visible = !visible">
                    <Icon :name="visible ? 'eye-off' : 'eye'" />
                </button>
            </div>
        </div>

        <div v-if="generator" class="flex flex-wrap items-center gap-2" role="group" :aria-label="de.create.diceGroup">
            <span class="text-xs font-medium text-muted-foreground">{{ de.create.diceGroup }}</span>
            <button type="button" class="btn btn-secondary btn-sm" data-testid="dice-words" @click="roll('words')"><Icon name="dice" />{{ de.create.diceWords }}</button>
            <button type="button" class="btn btn-secondary btn-sm" data-testid="dice-chars" @click="roll('chars')"><Icon name="dice" />{{ de.create.diceChars }}</button>
        </div>

        <div v-if="generator" class="flex flex-col gap-1.5" data-testid="strength">
            <div class="flex items-baseline justify-between gap-2 text-xs">
                <span class="font-medium">{{ de.strength.label }}</span>
                <span v-if="model.length" class="text-muted-foreground tabular-nums"><span class="font-semibold text-foreground">{{ de.strength.bits(bits) }}</span> · {{ source === 'typed' ? de.strength.estimate : de.strength.exact }}</span>
                <span v-else class="text-muted-foreground">{{ de.strength.none }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-sm border border-caption bg-input" role="presentation">
                <div class="h-full bg-foreground motion-safe:transition-[width]" :style="{ width: `${percent}%` }" />
            </div>
        </div>
        <p v-if="hint" class="hint">{{ hint }}</p>
    </div>
</template>
