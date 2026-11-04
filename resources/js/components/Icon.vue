<script setup lang="ts">
// Icons aus lucide-vue-next (ISC-Lizenz, Strichsymbole). Dekorativ (aria-hidden): die Bedeutung steht immer im Text daneben.
// Eine zentrale Zuordnung, damit die Oberfläche einen einheitlichen Satz benutzt und nur benannte Icons importiert werden.
import {
    ArrowRight, Ban, Check, ChevronDown, ChevronRight, CircleCheck, Clock, Copy, History, Dices, Eye, EyeOff, FileText, CircleHelp, Upload, Fingerprint, Flame, Hash, KeyRound,
    Link2, LockKeyhole, Minus, Moon, Plus, RefreshCw, Server, ShieldCheck, Sun, Trash2, TriangleAlert, X,
} from 'lucide-vue-next';
import type { Component } from 'vue';

const icons = {
    lock: LockKeyhole, eye: Eye, 'eye-off': EyeOff, dice: Dices, copy: Copy, check: Check, 'check-circle': CircleCheck,
    alert: TriangleAlert, trash: Trash2, minus: Minus, plus: Plus, clock: Clock, shield: ShieldCheck,
    'chevron-right': ChevronRight, 'chevron-down': ChevronDown, ban: Ban, link: Link2, key: KeyRound, 'arrow-right': ArrowRight, server: Server,
    sun: Sun, moon: Moon, hash: Hash, flame: Flame, fingerprint: Fingerprint, refresh: RefreshCw, close: X, 'file-text': FileText, help: CircleHelp, upload: Upload, history: History,
} satisfies Record<string, Component>;

export type IconName = keyof typeof icons;
defineProps<{ name: IconName }>();
</script>

<template>
    <component :is="icons[name]" :size="16" :stroke-width="1.75" aria-hidden="true" class="shrink-0" />
</template>
