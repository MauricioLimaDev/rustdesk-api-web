<template>
  <div>
    <el-card class="list-body" shadow="hover" v-loading="livros.loading">
      <template #header>{{ T('SharedBooks') }}</template>
      <el-alert v-if="!livros.list.length && !livros.loading" type="info" :closable="false" :title="T('SharedBooksEmpty')"/>
      <el-table v-else :data="livros.list" border>
        <el-table-column prop="name" :label="T('AddressBook')" align="center"/>
        <el-table-column prop="owner" :label="T('Owner')" align="center"/>
        <el-table-column :label="T('Rule')" align="center">
          <template #default="{row}">
            <el-tag :type="row.rule >= 3 ? 'danger' : (row.rule >= 2 ? 'warning' : 'info')">{{ T(regras[row.rule] || 'Read') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="T('Actions')" align="center" width="160">
          <template #default="{row}">
            <el-button @click="filtrarLivro(row.id)">{{ T('View') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="list-query" shadow="hover">
      <el-form inline label-width="80px">
        <el-form-item :label="T('AddressBookName')">
          <el-select v-model="query.collection_id" clearable style="width: 200px">
            <el-option :value="0" :label="T('All')"></el-option>
            <el-option v-for="l in livros.list" :key="l.id" :value="l.id" :label="l.name"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="ID">
          <el-input v-model="query.id" clearable style="width: 160px"/>
        </el-form-item>
        <el-form-item :label="T('Alias')">
          <el-input v-model="query.username" clearable style="width: 160px"/>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="buscar">{{ T('Filter') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-body" shadow="hover">
      <el-table :data="contatos.list" v-loading="contatos.loading" border>
        <el-table-column prop="id" label="ID" align="center" width="150"/>
        <el-table-column prop="alias" :label="T('Alias')" align="center"/>
        <el-table-column prop="hostname" :label="T('Hostname')" align="center"/>
        <el-table-column prop="platform" :label="T('Platform')" align="center" width="120"/>
        <el-table-column :label="T('AddressBookName')" align="center">
          <template #default="{row}">{{ row.collection?.name }}</template>
        </el-table-column>
        <el-table-column :label="T('Tags')" align="center">
          <template #default="{row}">
            <el-tag v-for="t in (row.tags || [])" :key="t" style="margin: 2px">{{ t }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <p style="color: var(--el-text-color-secondary); margin-bottom: 0">{{ T('SharedReadOnlyNote') }}</p>
    </el-card>

    <el-card class="list-page" shadow="hover">
      <el-pagination background
                     layout="prev, pager, next, sizes, jumper"
                     :page-sizes="[10,20,50,100]"
                     v-model:page-size="query.page_size"
                     v-model:current-page="query.page"
                     :total="contatos.total">
      </el-pagination>
    </el-card>
  </div>
</template>

<script setup>
  import { onMounted, reactive, watch } from 'vue'
  import { T } from '@/utils/i18n'
  import { collections, addressBooks } from '@/api/my/shared'

  const regras = { 1: 'Read', 2: 'ReadWrite', 3: 'FullControl' }
  const livros = reactive({ list: [], loading: false })
  const contatos = reactive({ list: [], total: 0, loading: false })
  const query = reactive({ page: 1, page_size: 10, collection_id: 0, id: '', username: '' })

  const carregarLivros = async () => {
    livros.loading = true
    try {
      const res = await collections()
      livros.list = res.data || []
    } finally {
      livros.loading = false
    }
  }

  const carregarContatos = async () => {
    contatos.loading = true
    try {
      const res = await addressBooks({ ...query, collection_id: query.collection_id || 0 })
      contatos.list = res.data?.list || []
      contatos.total = res.data?.total || 0
    } finally {
      contatos.loading = false
    }
  }

  const buscar = () => {
    query.page = 1
    carregarContatos()
  }

  const filtrarLivro = (id) => {
    query.collection_id = id
    buscar()
  }

  watch(() => [query.page, query.page_size], carregarContatos)

  onMounted(() => {
    carregarLivros()
    carregarContatos()
  })
</script>
