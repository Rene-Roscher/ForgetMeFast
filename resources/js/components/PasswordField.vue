<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon from '@/components/Icon.vue';
import Tip from '@/components/ui/Tip.vue';
import {
    EFF_LARGE_WORDLIST, PASSPHRASE_WORDS, PASSWORD_ALPHABET, PASSWORD_CHARS,
    estimateBits, generatedBits, randomChars, randomPassphrase,
} from '@/crypto';

const props = defineProps<{ id: string; label: string; hint?: string; generator?: boolean; autocomplete?: string; invalid?: boolean; describedby?: string }>();
const model = defineModel<string>({ required: true });
const source = defineModel<'typed' | 'words' | 'chars'>('source', { default: 'typed' });
const { t } = useI18n();
// Mit Generator ist das Passwort von Anfang an sichtbar (es wurde ja erzeugt); ohne Generator bleibt es verborgen.
const visible = ref(!!props.generator);
const mode = computed(() => (source.value === 'chars' ? 'chars' : 'words'));

const bits = computed(() => {
    if (model.value.length === 0) return 0;
    if (source.value === 'words') return generatedBits(EFF_LARGE_WORDLIST.length, PASSPHRASE_WORDS);
    if (source.value === 'chars') return generatedBits(PASSWORD_ALPHABET.length, PASSWORD_CHARS);
    return estimateBits(model.value);
});
const percent = computed(() => Math.min(100, (bits.value / 128) * 100));

function roll(kind: 'words' | 'chars'): void {
    model.value = kind === 'words' ? randomPassphrase(EFF_LARGE_WORDLIST) : randomChars();
    source.value = kind;
}
function setMode(value: unknown): void {
    if (value === 'words' || value === 'chars') roll(value);
}
function onInput(event: Event): void {
    model.value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    source.value = 'typed';
}
/** Enter im zweizeiligen Feld sendet das Formular ab, statt einen Zeilenumbruch einzufügen (ein Passwort hat keinen). */
function submitForm(event: KeyboardEvent): void {
    (event.target as HTMLElement).closest('form')?.requestSubmit();
}
</script>

<template>
    <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
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
                    class="field pr-11 font-mono"
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
                    class="field resize-none py-2 pr-11 font-mono leading-snug break-words"
                    @input="onInput"
                    @keydown.enter.prevent="submitForm"
                />
                <Tip :text="visible ? t('create.password.hide') : t('create.password.show')">
                    <button type="button" class="icon-btn absolute top-1 right-1" :aria-pressed="visible" :aria-label="visible ? t('create.password.hide') : t('create.password.show')" @click="visible = !visible">
                        <Icon :name="visible ? 'eye-off' : 'eye'" />
                    </button>
                </Tip>
            </div>
        </div>

        <div v-if="generator" class="flex items-center gap-2">
            <ToggleGroupRoot type="single" :model-value="mode" :aria-label="t('create.password.modeLabel')" class="inline-flex rounded-md bg-inset p-0.5" @update:model-value="setMode">
                <ToggleGroupItem value="words" data-testid="pw-mode-words" class="min-h-8 cursor-pointer rounded-md px-3 text-[0.8125rem] font-semibold text-foreground transition-colors hover:bg-accent focus-visible:shadow-none data-[state=on]:bg-foreground data-[state=on]:text-background">{{ t('create.password.words') }}</ToggleGroupItem>
                <ToggleGroupItem value="chars" data-testid="pw-mode-chars" class="min-h-8 cursor-pointer rounded-md px-3 text-[0.8125rem] font-semibold text-foreground transition-colors hover:bg-accent focus-visible:shadow-none data-[state=on]:bg-foreground data-[state=on]:text-background">{{ t('create.password.chars') }}</ToggleGroupItem>
            </ToggleGroupRoot>
            <Tip :text="t('create.password.refresh')">
                <button type="button" class="btn btn-secondary btn-sm px-2" data-testid="pw-refresh" :aria-label="t('create.password.refresh')" @click="roll(mode)"><Icon name="refresh" /></button>
            </Tip>
        </div>

        <div v-if="generator" class="flex flex-col gap-1.5" data-testid="strength">
            <div class="flex items-baseline justify-between gap-2 text-xs">
                <span class="font-medium">{{ t('create.password.strength') }}</span>
                <span v-if="model.length" class="text-muted-foreground tabular-nums"><span class="font-semibold text-foreground">{{ t('create.password.bits', { bits: Math.round(bits) }) }}</span> · {{ source === 'typed' ? t('create.password.estimate') : t('create.password.exact') }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-inset" role="presentation">
                <div class="h-full bg-foreground motion-safe:transition-[width]" :style="{ width: `${percent}%` }" />
            </div>
        </div>
        <p v-if="hint" class="hint">{{ hint }}</p>
    </div>
</template>
