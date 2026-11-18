<template>
  <div>
    <el-card shadow="hover" v-loading="carregando">
      <template #header>{{ T('Downloads') }}</template>
      <el-row :gutter="20">
        <el-col :xs="24" :md="12" v-for="item in itens" :key="item.tipo" style="margin-bottom: 20px">
          <el-card shadow="never">
            <h3 style="margin-top: 0">
              {{ T(titulo[item.tipo] || item.tipo) }}
              <el-tag v-if="item.experimental" type="warning" size="small" style="margin-left: 6px">{{ T('Experimental') }}</el-tag>
            </h3>
            <p style="min-height: 44px">{{ T(item.tipo === 'cliente' ? 'DownloadClienteNota' : (item.experimental ? 'DownloadEquipeMacNota' : 'DownloadEquipeNota')) }}</p>
            <template v-if="item.disponivel">
              <p style="color: var(--el-text-color-secondary)">
                {{ item.nome }} · {{ (item.tamanho / 1024 / 1024).toFixed(1) }} MB · {{ T('UpdatedAt') }} {{ item.atualizado }}
              </p>
              <el-button type="primary" :loading="baixando === item.tipo" @click="baixarItem(item)">
                {{ T('Baixar') }}
              </el-button>
              <el-button v-if="item.link_publico" @click="copiarLink(item)">{{ T('CopiarLinkPublico') }}</el-button>
            </template>
            <el-alert v-else type="warning" :closable="false" :title="T('DownloadIndisponivel')"/>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
  import { onMounted, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { T } from '@/utils/i18n'
  import { info, baixar } from '@/api/download'

  const titulo = {
    cliente: 'DownloadCliente',
    equipe: 'DownloadEquipe',
    'equipe-mac-arm64': 'DownloadEquipe-mac-arm64',
    'equipe-mac-intel': 'DownloadEquipe-mac-intel',
  }
  const itens = ref([])
  const carregando = ref(false)
  const baixando = ref('')

  const carregar = async () => {
    carregando.value = true
    try {
      const res = await info()
      itens.value = res.data || []
    } finally {
      carregando.value = false
    }
  }

  const baixarItem = async (item) => {
    baixando.value = item.tipo
    try {
      await baixar(item.tipo, item.nome)
    } catch (e) {
      ElMessage.error(T('Error'))
    } finally {
      baixando.value = ''
    }
  }

  const copiarLink = async (item) => {
    const link = window.location.origin + item.link_publico
    try {
      await navigator.clipboard.writeText(link)
      ElMessage.success(T('CopySuccess') + ': ' + link)
    } catch (e) {
      ElMessage.info(link)
    }
  }

  onMounted(carregar)
</script>
