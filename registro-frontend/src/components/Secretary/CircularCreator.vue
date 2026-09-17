<template>
  <q-card style="width: min(600px, 95vw); max-width: 95vw;">
    <q-card-section class="row items-center justify-between">
        <div class="text-h6">{{ t('communicationsPage.newCircular') }}</div>
        <q-btn icon="close" flat round dense v-close-popup :aria-label="t('common.close') || 'Chiudi'" />
    </q-card-section>

    <q-card-section>
        <q-form @submit="sendCircular" class="q-gutter-md">
            <q-input
              v-model="form.title"
              :label="t('communicationsPage.titleLabel')"
              outlined
              dense
              :rules="[val => (!!val && val.trim().length > 0) || (t('common.requiredField') || 'Campo obbligatorio')]"
            />
            
            <div class="text-subtitle2">{{ t('communicationsPage.recipientRole') }}</div>
            <div class="row q-gutter-sm">
                <q-checkbox v-model="form.recipients.teachers" :label="t('usersPage.roleTeachers') || 'Docenti'" />
                <q-checkbox v-model="form.recipients.parents" :label="t('usersPage.roleParents') || 'Genitori'" />
                <q-checkbox v-model="form.recipients.students" :label="t('usersPage.roleStudents') || 'Studenti'" />
                <q-checkbox v-model="form.recipients.staff" :label="t('usersPage.roleStaff') || 'Personale ATA'" />
            </div>

            <q-select
                v-if="form.recipients.students || form.recipients.parents"
                v-model="form.specificClasses"
                multiple
                use-chips
                emit-value
                map-options
                :options="classOptions"
                :label="t('udaPage.classLabel')"
                outlined
                dense
            />

            <div class="q-my-sm">
                <div class="text-subtitle2 q-mb-xs">{{ t('communicationsPage.bodyLabel') }}</div>
                <q-editor v-model="form.content" min-height="150px" />
            </div>

            <q-file v-model="form.attachments" multiple :label="t('communicationsPage.hasAttachment')" outlined dense use-chips>
                <template v-slot:prepend><q-icon name="attach_file" /></template>
            </q-file>

            <div class="row justify-end q-mt-md">
                <q-btn :label="t('common.cancel')" flat v-close-popup color="grey" />
                <q-btn :label="t('communicationsPage.publish')" type="submit" color="primary" class="q-ml-sm" icon="send" :loading="sending" />
            </div>
        </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useCommunicationsStore } from '@/stores/communications'
import { useClassesStore } from '@/stores/classes'
import { useAuthStore } from '@/stores/auth'
import { userService } from '@/services/userService'

const ATA_ROLES = [
    'dsga', 'assistente_amministrativo', 'collaboratore_ds', 'collaboratore_scolastico',
    'assistente_alunni', 'assistente_personale', 'assistente_contabilita',
    'assistente_protocollo', 'assistente_sportello', 'assistente_tecnico', 'responsabile_servizio'
]

const $q = useQuasar()
const { t } = useI18n()
const commStore = useCommunicationsStore()
const classesStore = useClassesStore()
const authStore = useAuthStore()
const emit = defineEmits(['sent', 'cancel'])

const sending = ref(false)

const classOptions = computed(() =>
    classesStore.classes.map(c => ({
        label: c.name || `${c.year || ''}${c.section || ''}`.trim() || c.id,
        value: c.id
    }))
)

const form = reactive({
    title: '',
    content: '',
    recipients: {
        teachers: false,
        parents: false,
        students: false,
        staff: false
    },
    specificClasses: [],
    attachments: []
})

onMounted(async () => {
    if (classesStore.classes.length === 0) {
        await classesStore.fetchClasses()
    }
})

// The backend only accepts an explicit list of recipient user IDs
// (POST /communications resolves `recipients` via ListByIDs, not roles or
// class filters), so the role/class checkboxes here must be resolved to
// concrete user IDs client-side before sending.
const resolveRecipientIds = async () => {
    const schoolId = authStore.user?.school_id
    const ids = new Set()

    const fetchByRole = async (role, extraParams = {}) => {
        const res = await userService.getUsers({ role, school_id: schoolId, page_size: 500, ...extraParams })
        return res.data?.users || []
    }

    if (form.recipients.teachers) {
        (await fetchByRole('teacher')).forEach(u => ids.add(u.id))
    }
    if (form.recipients.students) {
        if (form.specificClasses.length > 0) {
            for (const classId of form.specificClasses) {
                (await fetchByRole('student', { class_id: classId })).forEach(u => ids.add(u.id))
            }
        } else {
            (await fetchByRole('student')).forEach(u => ids.add(u.id))
        }
    }
    if (form.recipients.parents) {
        (await fetchByRole('parent')).forEach(u => ids.add(u.id))
    }
    if (form.recipients.staff) {
        for (const role of ATA_ROLES) {
            (await fetchByRole(role)).forEach(u => ids.add(u.id))
        }
    }

    return Array.from(ids)
}

const sendCircular = async () => {
    if (!form.recipients.teachers && !form.recipients.parents && !form.recipients.students && !form.recipients.staff) {
        $q.notify({ type: 'warning', message: t('communicationsPage.recipientsLabel') })
        return
    }

    sending.value = true
    try {
        const recipientIds = await resolveRecipientIds()
        if (recipientIds.length === 0) {
            $q.notify({ type: 'warning', message: t('communicationsPage.noRecipientsFound') || 'Nessun destinatario trovato per i criteri selezionati.' })
            return
        }
        await commStore.sendMessage({
            subject: form.title,
            body: form.content,
            recipients: recipientIds,
            type: 'circular'
        })
        $q.notify({ type: 'positive', message: t('common.success') })
        emit('sent')
    } catch (err) {
        $q.notify({ type: 'negative', message: t('common.error') })
    } finally {
        sending.value = false
    }
}

defineExpose({
    form,
    sendCircular,
    sending
})
</script>
