<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';
import Tip from '@/components/ui/Tip.vue';
import {
    EFF_LARGE_WORDLIST, PASSPHRASE_WORDS, PASSWORD_ALPHABET, PASSWORD_CHARS,
    estimateBits, generatedBits, randomChars, randomPassphrase,
} from '@/crypto';

defineProps<{ id: string; label: string; hint?: string; generator?: boolean; autocomplete?: string; invalid?: boolean; describedby?: string }>();
const model = defineModel<string>({ required: true });
const source = defineModel<'typed' | 'words' | 'chars'>('source', { default: 'typed' });
const { t } = useI18n();
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
    model.value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    source.value = 'typed';
}
/** Enter im zweizeiligen Feld sendet das Formular ab, statt einen Zeilenumbruch einzufügen (ein Passwort hat keinen). */
function submitForm(event: KeyboardEvent) {
    (event.target as HTMLElement).closest('form')?.requestSubmit();
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
            <label :for="id" class="label">{{ label }}</label>
            <div class="relative">
                <!-- Verborgen: ein Passwortfeld. Sichtbar: ein zweizeiliges Feld, damit eine lange Passphrase vollständig lesbar bleibt. -->
                <input
                    v-if="!visible"
                    :id="id"
                    :value="model"
                    type="password"
                    :autocomplete="autocomplete ?? 'off'"
                    :aria-invalid="invalid || undefined"
                    :aria-describedby="describedby"
                    spellcheck="false"
                    autocapitalize="off"
                    class="field pr-14 font-mono text-[0.9375rem]"
                    @input="onInput"
                />
                <textarea
                    v-else
                    :id="id"
                    :value="model"
                    rows="2"
                    :autocomplete="autocomplete ?? 'off'"
                    :aria-invalid="invalid || undefined"
                    :aria-describedby="describedby"
                    spellcheck="false"
                    autocapitalize="off"
                    class="field resize-none py-3 pr-14 font-mono text-[0.9375rem] leading-snug break-words"
                    @input="onInput"
                    @keydown.enter.prevent="submitForm"
                />
                <Tip :text="visible ? t('create.password.hide') : t('create.password.show')">
                    <button type="button" class="icon-btn absolute top-1.5 right-1.5" :aria-pressed="visible" :aria-label="visible ? t('create.password.hide') : t('create.password.show')" @click="visible = !visible">
                        <Icon :name="visible ? 'eye-off' : 'eye'" />
                    </button>
                </Tip>
            </div>
        </div>

        <div v-if="generator" class="flex flex-wrap items-center gap-2" role="group" :aria-label="t('create.password.generate')">
            <span class="text-sm font-medium text-muted-foreground">{{ t('create.password.generate') }}</span>
            <button type="button" class="btn btn-secondary btn-sm" data-testid="dice-words" @click="roll('words')"><Icon name="dice" />{{ t('create.password.words') }}</button>
            <button type="button" class="btn btn-secondary btn-sm" data-testid="dice-chars" @click="roll('chars')"><Icon name="dice" />{{ t('create.password.chars') }}</button>
        </div>

        <div v-if="generator" class="flex flex-col gap-2" data-testid="strength">
            <div class="flex items-baseline justify-between gap-2 text-sm">
                <span class="font-medium">{{ t('create.password.strength') }}</span>
                <span v-if="model.length" class="text-muted-foreground tabular-nums"><span class="font-semibold text-foreground">{{ t('create.password.bits', { bits: Math.round(bits) }) }}</span> · {{ source === 'typed' ? t('create.password.estimate') : t('create.password.exact') }}</span>
                <span v-else class="text-muted-foreground">{{ t('create.password.none') }}</span>
            </div>
            <div class="h-2.5 overflow-hidden rounded-sm border border-caption bg-input" role="presentation">
                <div class="h-full bg-foreground motion-safe:transition-[width]" :style="{ width: `${percent}%` }" />
            </div>
        </div>
        <p v-if="hint" class="hint">{{ hint }}</p>
    </div>
</template>
