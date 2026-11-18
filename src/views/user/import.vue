<template>
  <div>
    <el-card shadow="hover">
      <template #header>{{ T('UserImport') }}</template>
      <el-upload drag :auto-upload="false" :show-file-list="false" accept=".csv,text/csv" :on-change="lerArquivo">
        <div class="el-upload__text" style="padding: 24px 0">{{ T('Drop file here or click to upload') }}</div>
        <template #tip>
          <div class="el-upload__tip">
            {{ T('UserImportTip') }}
            <el-button link type="primary" @click.stop="baixarModelo">{{ T('UserImportModel') }}</el-button>
          </div>
        </template>
      </el-upload>
    </el-card>

    <el-card v-if="linhas.length" shadow="hover" class="list-body">
      <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
        <el-button type="primary" :disabled="!selecionadas.length || salvando" :loading="salvando" @click="salvar">
          {{ T('UserImportSave', { param: String(selecionadas.length) }) }}
        </el-button>
        <el-button v-if="criados.length" type="success" @click="baixarSenhas">{{ T('UserImportPasswords') }}</el-button>
        <el-button :disabled="salvando" @click="limpar">{{ T('Cancel') }}</el-button>
        <span style="color: var(--el-text-color-secondary)">{{ T('UserImportSummary', { ok: String(contar('pronto')), existe: String(contar('existe')), erro: String(contar('erro')) }) }}</span>
      </div>
      <el-progress v-if="salvando" :percentage="progresso" style="margin-bottom: 12px"/>
      <el-table ref="tabela" :data="linhas" border row-key="linha" @selection-change="s => selecionadas = s">
        <el-table-column type="selection" width="50" align="center" :selectable="r => r.estado === 'pronto'"/>
        <el-table-column prop="linha" label="#" width="60" align="center"/>
        <el-table-column prop="usuario" :label="T('Username')" align="center"/>
        <el-table-column prop="nome" :label="T('Nickname')" align="center"/>
        <el-table-column prop="email" :label="T('Email')" align="center"/>
        <el-table-column prop="grupo" :label="T('Group')" align="center"/>
        <el-table-column :label="T('IsAdmin')" width="80" align="center">
          <template #default="{row}">{{ row.admin ? T('Yes') : T('No') }}</template>
        </el-table-column>
        <el-table-column :label="T('Password')" width="120" align="center">
          <template #default="{row}">{{ row.senha ? T('UserImportPwdFile') : T('UserImportPwdAuto') }}</template>
        </el-table-column>
        <el-table-column :label="T('Status')" min-width="200" align="center">
          <template #default="{row}">
            <el-tag :type="tipoTag[row.estado]">{{ T('UserImportState_' + row.estado) }}</el-tag>
            <div v-if="row.msg" style="font-size: 12px; margin-top: 4px">{{ row.msg }}</div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
  import { nextTick, ref } from 'vue'
  import axios from 'axios'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { T } from '@/utils/i18n'
  import { getToken } from '@/utils/auth'
  import { useUserStore } from '@/store/user'
  import { pinia } from '@/store'

  const linhas = ref([])
  const selecionadas = ref([])
  const criados = ref([])
  const salvando = ref(false)
  const progresso = ref(0)
  const tabela = ref()
  const tipoTag = { pronto: 'info', existe: 'warning', erro: 'danger', criado: 'success' }
  let grupos = {}

  // Chamadas diretas (sem o interceptor que mostra um aviso por erro): numa importação
  // em lote o erro de cada linha aparece na própria tabela.
  const api = async (method, url, data) => {
    const token = useUserStore(pinia).token || getToken()
    const res = await axios({
      method, url: import.meta.env.VITE_SERVER_API + url,
      headers: { 'api-token': token, 'Accept-Language': 'pt-BR' },
      ...(method === 'get' ? { params: data } : { data }),
    })
    if (res.data?.code !== 0) throw new Error(res.data?.message || 'erro')
    return res.data.data
  }

  const contar = (estado) => linhas.value.filter(l => l.estado === estado).length

  // CSV simples: separador ; ou , (detectado no cabeçalho), aceita aspas
  const parseCsv = (texto) => {
    texto = texto.replace(/^﻿/, '')
    const sep = (texto.split(/\r?\n/)[0].match(/;/g) || []).length >= (texto.split(/\r?\n/)[0].match(/,/g) || []).length ? ';' : ','
    const rows = []
    let row = [], campo = '', aspas = false
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i]
      if (aspas) {
        if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ } else if (c === '"') { aspas = false } else { campo += c }
      } else if (c === '"') { aspas = true }
      else if (c === sep) { row.push(campo); campo = '' }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++
        row.push(campo); rows.push(row); row = []; campo = ''
      } else { campo += c }
    }
    if (campo !== '' || row.length) { row.push(campo); rows.push(row) }
    return rows.filter(r => r.some(v => v.trim() !== ''))
  }

  const lerArquivo = async (arquivo) => {
    const texto = await arquivo.raw.text()
    const rows = parseCsv(texto)
    if (rows.length < 2) { ElMessage.error(T('UserImportEmpty')); return }
    const cab = rows[0].map(h => h.trim().toLowerCase())
    const idx = (nomes) => cab.findIndex(h => nomes.includes(h))
    const col = {
      usuario: idx(['usuario', 'usuário', 'username', 'login']),
      nome: idx(['nome', 'name', 'nickname']),
      email: idx(['email', 'e-mail']),
      grupo: idx(['grupo', 'group']),
      admin: idx(['admin', 'administrador']),
      senha: idx(['senha', 'password']),
    }
    if (col.usuario < 0) { ElMessage.error(T('UserImportNoUserCol')); return }

    try {
      const g = await api('get', '/group/list', { page: 1, page_size: 1000 })
      grupos = {}
      for (const x of (g.list || [])) grupos[x.name.toLowerCase()] = x.id
    } catch (e) { ElMessage.error(e.message); return }

    const vistos = new Set()
    linhas.value = rows.slice(1).map((r, i) => {
      const v = (k) => (col[k] >= 0 ? (r[col[k]] || '').trim() : '')
      const l = {
        linha: i + 2, usuario: v('usuario'), nome: v('nome'), email: v('email'), grupo: v('grupo'),
        admin: ['sim', 's', '1', 'true', 'yes', 'x'].includes(v('admin').toLowerCase()),
        senha: v('senha'), estado: 'pronto', msg: '',
      }
      const erro = (m) => { l.estado = 'erro'; l.msg = m }
      if (!/^[A-Za-z0-9._@-]{2,32}$/.test(l.usuario)) erro(T('UserImportBadUser'))
      else if (vistos.has(l.usuario.toLowerCase())) erro(T('UserImportDuplicated'))
      else if (!l.grupo) erro(T('UserImportNoGroup'))
      else if (!(l.grupo.toLowerCase() in grupos)) erro(T('UserImportGroupMissing', { param: l.grupo }))
      else if (l.senha && (l.senha.length < 4 || l.senha.length > 32)) erro(T('UserImportBadPwd'))
      vistos.add(l.usuario.toLowerCase())
      return l
    })

    // marca quem já existe no painel
    for (const l of linhas.value.filter(x => x.estado === 'pronto')) {
      try {
        const res = await api('get', '/user/list', { page: 1, page_size: 100, username: l.usuario })
        if ((res.list || []).some(u => u.username.toLowerCase() === l.usuario.toLowerCase())) {
          l.estado = 'existe'; l.msg = T('UserImportExists')
        }
      } catch (e) { l.estado = 'erro'; l.msg = e.message }
    }
    criados.value = []
    await nextTick()
    linhas.value.filter(l => l.estado === 'pronto').forEach(l => tabela.value?.toggleRowSelection(l, true))
  }

  const novaSenha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const b = new Uint8Array(12)
    crypto.getRandomValues(b)
    return Array.from(b, x => chars[x % chars.length]).join('')
  }

  const salvar = async () => {
    const lista = [...selecionadas.value]
    try {
      await ElMessageBox.confirm(T('UserImportConfirm', { param: String(lista.length) }), T('Confirm'), { type: 'warning' })
    } catch { return }
    salvando.value = true
    progresso.value = 0
    let feitos = 0
    for (const l of lista) {
      try {
        const senha = l.senha || novaSenha()
        await api('post', '/user/create', {
          username: l.usuario, nickname: l.nome, email: l.email, group_id: grupos[l.grupo.toLowerCase()],
          is_admin: l.admin, status: 1, remark: 'importado',
        })
        const res = await api('get', '/user/list', { page: 1, page_size: 100, username: l.usuario })
        const novo = (res.list || []).filter(u => u.username.toLowerCase() === l.usuario.toLowerCase()).sort((a, b) => b.id - a.id)[0]
        if (!novo) throw new Error(T('UserImportNotFoundAfter'))
        await api('post', '/user/changePwd', { id: novo.id, password: senha })
        l.estado = 'criado'; l.msg = ''
        criados.value.push({ usuario: novo.username, nome: l.nome, grupo: l.grupo, senha })
      } catch (e) {
        l.estado = 'erro'; l.msg = e.message
      }
      feitos++
      progresso.value = Math.round(feitos * 100 / lista.length)
    }
    salvando.value = false
    tabela.value?.clearSelection()
    ElMessage.success(T('UserImportDone', { param: String(criados.value.length) }))
  }

  const baixarCsv = (nome, linhasCsv) => {
    const conteudo = '﻿' + linhasCsv.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = nome; a.click()
    URL.revokeObjectURL(url)
  }

  const baixarSenhas = () => {
    baixarCsv('usuarios-criados.csv', [['usuario', 'nome', 'grupo', 'senha'], ...criados.value.map(c => [c.usuario, c.nome, c.grupo, c.senha])])
    ElMessage.warning(T('UserImportPwdWarning'))
  }

  const baixarModelo = () => {
    baixarCsv('modelo-usuarios.csv', [
      ['usuario', 'nome', 'email', 'grupo', 'admin', 'senha'],
      ['joao', 'João Silva', 'joao@exemplo.com.br', 'Suporte', 'nao', ''],
    ])
  }

  const limpar = () => {
    linhas.value = []
    selecionadas.value = []
    criados.value = []
  }
</script>
