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

            <q-file
              v-model="form.attachment"
              :label="t('communicationsPage.hasAttachment')"
              outlined dense use-chips
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              hint="Un solo allegato per circolare (PDF, immagine o documento Office)"
            >
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
import communicationService from '@/services/communicationService'

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
    attachment: null
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
    if (window.__remoteLog) window.__remoteLog('CircularCreator', 'resolveRecipientIds start, schoolId=' + schoolId + ' recipients=' + JSON.stringify(form.recipients))

    const fetchByRole = async (role, extraParams = {}) => {
        try {
            const res = await userService.getUsers({ role, school_id: schoolId, page_size: 500, ...extraParams })
            const users = res.data?.users || []
            if (window.__remoteLog) window.__remoteLog('CircularCreator', 'fetchByRole ' + role + ' -> ' + users.length + ' users')
            return users
        } catch (e) {
            if (window.__remoteLog) window.__remoteLog('CircularCreator', 'fetchByRole ' + role + ' FAILED: ' + (e.response?.status || '') + ' ' + JSON.stringify(e.response?.data || e.message))
            throw e
        }
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

    const result = Array.from(ids)
    if (window.__remoteLog) window.__remoteLog('CircularCreator', 'resolveRecipientIds done, total=' + result.length)
    return result
}

const sendCircular = async () => {
    if (!form.title || !form.title.trim()) {
        $q.notify({ type: 'warning', message: t('common.requiredField') || 'Il titolo è obbligatorio.' })
        return
    }
    // The backend requires a non-empty body; the rich-text editor has no
    // built-in "required" validation, so check it here before sending.
    const plainContent = form.content.replace(/<[^>]*>/g, '').trim()
    if (!plainContent) {
        $q.notify({ type: 'warning', message: t('communicationsPage.bodyRequired') || 'Il testo della comunicazione è obbligatorio.' })
        return
    }
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
        let attachmentUrl = null
        if (form.attachment) {
            const uploadRes = await communicationService.uploadAttachment(form.attachment)
            attachmentUrl = uploadRes.data?.attachment_url || null
        }

        if (window.__remoteLog) window.__remoteLog('CircularCreator', 'sending to backend, recipients=' + recipientIds.length + ' attachment=' + !!attachmentUrl)
        await commStore.sendMessage({
            subject: form.title,
            body: form.content,
            recipients: recipientIds,
            type: 'circular',
            attachment_url: attachmentUrl
        })
        $q.notify({ type: 'positive', message: t('common.success') })
        emit('sent')
    } catch (err) {
        if (window.__remoteLog) window.__remoteLog('CircularCreator', 'sendCircular FAILED: ' + (err.response?.status || '') + ' ' + JSON.stringify(err.response?.data || err.message || String(err)))
        $q.notify({ type: 'negative', message: err.response?.data?.error || t('common.error') })
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
