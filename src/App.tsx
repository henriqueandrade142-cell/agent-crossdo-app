import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  ChevronDown,
  Edit3,
  HelpCircle,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react'
import './App.css'

type Screen = 'dashboard' | 'usuarios' | 'clientesGrupos'
type Status = 'Ativo' | 'Inativo'
type ContactType = 'Interno' | 'Externo' | 'Não definido'

type UserRecord = {
  id: string
  nome: string
  email: string
  whatsapp: string
  setor: string
  perfil: 'Master' | 'Administrador' | 'Atendimento'
  status: Status
  protegido?: boolean
}

type GroupContact = {
  id: string
  nome: string
  funcao: string
  whatsapp: string
  email: string
  tipo: ContactType
}

type ClientGroupRecord = {
  id: string
  nomeGrupo: string
  idGrupo: string
  statusGrupo: Status
  nomeCliente: string
  documento: string
  responsavelCliente: string
  emailResponsavel: string
  telefoneResponsavel: string
  unidade: string
  demandaMonitorada: boolean
  crossAgentAdicionado: boolean
  agentAtivo: boolean
  funcionalidades: string[]
  wmsApiKeyUsuario: string
  wmsApiKey: string
  wmsApiKeySet: boolean
  observacoes: string
  origemCadastro: 'n8n' | 'manual'
  contatos: GroupContact[]
}

const MASTER_EMAIL = 'henrique.andrade142@gmail.com'
const MASTER_WHATSAPP = '(31) 98502-4841'
const MASTER_SETOR = 'TI'
const MASTER_PASSWORD_HASH = '4cfd8b11c5d6d57f420889084a45b4a808f4c4ecc21c3abc6aa903fc99e5536a'
const USERS_KEY = 'agent_crossdo_users'

const masterUser: UserRecord = {
  id: 'USR-0001',
  nome: 'Henrique Andrade',
  email: MASTER_EMAIL,
  whatsapp: MASTER_WHATSAPP,
  setor: MASTER_SETOR,
  perfil: 'Master',
  status: 'Ativo',
  protegido: true,
}

const emptyUser: UserRecord = {
  id: '',
  nome: '',
  email: '',
  whatsapp: '',
  setor: '',
  perfil: 'Atendimento',
  status: 'Ativo',
}

const emptyContact: GroupContact = {
  id: '',
  nome: '',
  funcao: '',
  whatsapp: '',
  email: '',
  tipo: 'Não definido',
}

const emptyClientGroup: ClientGroupRecord = {
  id: '',
  nomeGrupo: '',
  idGrupo: '',
  statusGrupo: 'Ativo',
  nomeCliente: '',
  documento: '',
  responsavelCliente: '',
  emailResponsavel: '',
  telefoneResponsavel: '',
  unidade: 'Nova Lima/MG',
  demandaMonitorada: false,
  crossAgentAdicionado: false,
  agentAtivo: false,
  funcionalidades: [],
  wmsApiKeyUsuario: '',
  wmsApiKey: '',
  wmsApiKeySet: false,
  observacoes: '',
  origemCadastro: 'manual',
  contatos: [],
}

const FUNCIONALIDADES_AGENT: string[] = []

function normalizeClientGroupRecord(record: Partial<ClientGroupRecord>): ClientGroupRecord {
  return {
    ...emptyClientGroup,
    ...record,
    demandaMonitorada: Boolean(record.demandaMonitorada),
    crossAgentAdicionado: Boolean(record.crossAgentAdicionado),
    agentAtivo: Boolean(record.agentAtivo),
    funcionalidades: Array.isArray(record.funcionalidades) ? record.funcionalidades : [],
    wmsApiKeyUsuario: record.wmsApiKeyUsuario || '',
    wmsApiKey: '',
    wmsApiKeySet: Boolean(record.wmsApiKeySet),
    contatos: Array.isArray(record.contatos) ? record.contatos : [],
  }
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function formatWhatsapp(value: string) {
  const digits = normalizePhone(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function isValidWhatsapp(value: string) {
  const digits = normalizePhone(value)
  return digits.length === 10 || digits.length === 11
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function formatCnpj(value: string) {
  const digits = normalizePhone(value).slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function isValidCnpj(value: string) {
  const cnpj = normalizePhone(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const calc = (base: string, factors: number[]) => {
    const sum = factors.reduce((acc, factor, index) => acc + Number(base[index]) * factor, 0)
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }
  const digit1 = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const digit2 = calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return digit1 === Number(cnpj[12]) && digit2 === Number(cnpj[13])
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({})) as T & { detail?: string }
  if (!response.ok) throw new Error(data.detail || 'Falha na solicitação')
  return data
}

async function getJson<T>(path: string): Promise<T> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const response = await fetch(`${apiBaseUrl}${path}`)
  const data = await response.json().catch(() => ({})) as T & { detail?: string }
  if (!response.ok) throw new Error(data.detail || 'Falha na solicitação')
  return data
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({})) as T & { detail?: string }
  if (!response.ok) throw new Error(data.detail || 'Falha na solicitação')
  return data
}

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStore<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [cadastrosOpen, setCadastrosOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [flash, setFlash] = useState('')

  const [users, setUsers] = useState<UserRecord[]>([masterUser])
  const [clientGroups, setClientGroups] = useState<ClientGroupRecord[]>([])
  const [userForm, setUserForm] = useState<UserRecord>(emptyUser)
  const [clientGroupForm, setClientGroupForm] = useState<ClientGroupRecord>(emptyClientGroup)
  const [contactForm, setContactForm] = useState<GroupContact>(emptyContact)
  const [userSearch, setUserSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')

  useEffect(() => {
    const storedUsers = readStore<UserRecord[]>(USERS_KEY, [masterUser])
    const normalizedUsers = storedUsers.map((user) => ({ ...user, whatsapp: user.whatsapp ?? '' }))
    const hasMaster = normalizedUsers.some((user) => user.id === masterUser.id)
    setUsers(hasMaster ? normalizedUsers.map((user) => (user.id === masterUser.id ? masterUser : user)) : [masterUser, ...normalizedUsers])

    getJson<{ items: ClientGroupRecord[] }>('/api/v1/grupos-clientes')
      .then((data) => setClientGroups((data.items || []).map(normalizeClientGroupRecord)))
      .catch(() => notify('Não foi possível carregar os grupos identificados pelo n8n.'))
  }, [])

  function notify(message: string) {
    setFlash(message)
    window.setTimeout(() => setFlash(''), 2800)
  }

  function persistUsers(next: UserRecord[]) {
    const normalized = next.some((user) => user.id === masterUser.id)
      ? next.map((user) => (user.id === masterUser.id ? masterUser : user))
      : [masterUser, ...next]
    setUsers(normalized)
    writeStore(USERS_KEY, normalized)
  }

  function updateClientGroupState(record: ClientGroupRecord) {
    setClientGroups((current) => current.map((item) => (item.id === record.id ? record : item)))
  }

  function findKnownInternalContact(whatsapp: string) {
    const phone = normalizePhone(whatsapp)
    if (!phone) return null

    const user = users.find((item) => normalizePhone(item.whatsapp) === phone)
    if (user) {
      return { nome: user.nome, email: user.email, funcao: user.setor, tipo: 'Interno' as ContactType }
    }

    for (const group of clientGroups) {
      const contact = group.contatos.find((item) => item.tipo === 'Interno' && normalizePhone(item.whatsapp) === phone)
      if (contact) return { nome: contact.nome, email: contact.email, funcao: contact.funcao, tipo: 'Interno' as ContactType }
    }
    return null
  }

  function autofillInternalContact(contact: GroupContact): GroupContact {
    const known = findKnownInternalContact(contact.whatsapp)
    if (!known || (contact.tipo !== 'Interno' && contact.tipo !== 'Não definido')) return contact
    return {
      ...contact,
      tipo: 'Interno',
      nome: contact.nome || known.nome,
      email: contact.email || known.email,
      funcao: contact.funcao || known.funcao,
    }
  }

  const filteredUsers = users.filter((user) => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return true
    return [user.nome, user.email, user.whatsapp, user.setor, user.perfil, user.status].some((value) => value.toLowerCase().includes(term))
  })

  const filteredClientGroups = clientGroups.filter((record) => {
    const term = clientSearch.trim().toLowerCase()
    if (!term) return true
    return [record.nomeGrupo, record.idGrupo, record.nomeCliente, record.documento, record.responsavelCliente, record.unidade, record.wmsApiKeyUsuario, record.demandaMonitorada ? 'demanda monitorada' : '', record.statusGrupo].some((value) => String(value).toLowerCase().includes(term))
  })

  const activeUsers = users.filter((user) => user.status === 'Ativo').length
  const activeGroups = clientGroups.filter((group) => group.statusGrupo === 'Ativo').length
  const pendingGroups = clientGroups.filter((group) => !group.nomeCliente.trim() || !group.demandaMonitorada).length

  const stats = useMemo(
    () => [
      { label: 'Grupos identificados', value: String(clientGroups.length), hint: `${activeGroups} ativo(s)`, tone: 'blue' },
      { label: 'Cadastros pendentes', value: String(pendingGroups), hint: 'Aguardando complemento', tone: 'orange' },
      { label: 'Usuários ativos', value: String(activeUsers), hint: `${users.length} cadastrado(s)`, tone: 'green' },
      { label: 'Modo operação', value: 'Manual', hint: 'Aprovação humana', tone: 'red' },
    ],
    [activeGroups, activeUsers, clientGroups.length, pendingGroups, users.length],
  )

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    const emailOk = loginEmail.trim().toLowerCase() === MASTER_EMAIL
    const passwordOk = (await sha256(loginPassword)) === MASTER_PASSWORD_HASH
    if (!emailOk || !passwordOk) {
      setLoginError('E-mail ou senha inválidos.')
      return
    }
    setAuthenticated(true)
    setLoginPassword('')
  }

  async function handleForgotPassword() {
    setLoginError('')
    const email = loginEmail.trim().toLowerCase()
    if (!email) {
      setLoginError('Informe o e-mail para solicitar recuperação de senha.')
      return
    }
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/esqueci-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw new Error('Falha na solicitação')
      const data = await response.json() as { mensagem?: string }
      notify(data.mensagem || 'Se esse e-mail estiver cadastrado e ativo, enviaremos uma nova senha.')
    } catch {
      setLoginError('Motor de e-mail ainda não respondeu. Verifique a API do Agent CrossDo.')
    }
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = userForm.email.trim().toLowerCase()
    const maskedWhatsapp = formatWhatsapp(userForm.whatsapp)

    if (!userForm.nome.trim() || !normalizedEmail || !userForm.setor.trim()) {
      notify('Preencha nome, e-mail e setor.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      notify('Informe um e-mail válido.')
      return
    }
    if (userForm.whatsapp.trim() && !isValidWhatsapp(userForm.whatsapp)) {
      notify('Informe um WhatsApp válido com DDD.')
      return
    }
    if (userForm.id === masterUser.id) return
    const exists = users.some((user) => user.id !== userForm.id && user.email.toLowerCase() === normalizedEmail)
    if (exists) {
      notify('Já existe usuário com este e-mail.')
      return
    }

    const record = { ...userForm, email: normalizedEmail, whatsapp: maskedWhatsapp, id: userForm.id || generateId('USR') }

    if (!userForm.id) {
      try {
        await postJson<{ ok: boolean; mensagem: string }>('/api/v1/usuarios', record)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Não foi possível enviar o e-mail de primeiro acesso.')
        return
      }
    }

    persistUsers(userForm.id ? users.map((user) => (user.id === userForm.id ? record : user)) : [...users, record])
    setUserForm(emptyUser)
    notify(userForm.id ? 'Usuário salvo.' : 'Usuário criado e senha enviada por e-mail.')
  }

  function editUser(user: UserRecord) {
    if (user.id === masterUser.id) return
    setUserForm(user)
  }

  function deleteUser(id: string) {
    if (id === masterUser.id) return
    persistUsers(users.filter((user) => user.id !== id))
    if (userForm.id === id) setUserForm(emptyUser)
    notify('Usuário removido.')
  }

  function toggleUserStatus(user: UserRecord) {
    if (user.id === masterUser.id) return
    persistUsers(users.map((item) => (item.id === user.id ? { ...item, status: item.status === 'Ativo' ? 'Inativo' : 'Ativo' } : item)))
  }


  async function resetUserPassword(user: UserRecord) {
    if (user.id === masterUser.id) return
    if (!isValidEmail(user.email)) {
      notify('Usuário sem e-mail válido.')
      return
    }
    try {
      const result = await postJson<{ ok: boolean; mensagem: string }>('/api/v1/usuarios/resetar-senha', { email: user.email })
      notify(result.mensagem || 'Nova senha enviada por e-mail.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível resetar a senha.')
    }
  }

  async function saveClientGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientGroupForm.id) {
      notify('O cadastro é criado automaticamente quando o grupo chega pelo n8n.')
      return
    }
    if (!clientGroupForm.nomeGrupo.trim() || !clientGroupForm.idGrupo.trim()) {
      notify('Nome do grupo e ID do grupo vêm do n8n e são obrigatórios.')
      return
    }
    if (clientGroupForm.emailResponsavel.trim() && !isValidEmail(clientGroupForm.emailResponsavel)) {
      notify('Informe um e-mail de responsável válido.')
      return
    }
    if (clientGroupForm.telefoneResponsavel.trim() && !isValidWhatsapp(clientGroupForm.telefoneResponsavel)) {
      notify('Informe um WhatsApp de responsável válido com DDD.')
      return
    }
    if (clientGroupForm.documento.trim() && !isValidCnpj(clientGroupForm.documento)) {
      notify('Informe um CNPJ válido.')
      return
    }
    const record = normalizeClientGroupRecord({ ...clientGroupForm, documento: formatCnpj(clientGroupForm.documento), emailResponsavel: clientGroupForm.emailResponsavel.trim().toLowerCase(), telefoneResponsavel: formatWhatsapp(clientGroupForm.telefoneResponsavel), wmsApiKeyUsuario: clientGroupForm.wmsApiKeyUsuario.trim(), agentAtivo: clientGroupForm.crossAgentAdicionado ? clientGroupForm.agentAtivo : false, funcionalidades: clientGroupForm.crossAgentAdicionado ? clientGroupForm.funcionalidades : [] })
    try {
      const saved = await putJson<ClientGroupRecord>(`/api/v1/grupos-clientes/${record.id}`, record)
      updateClientGroupState(saved)
      setClientGroupForm(saved)
      setContactForm(emptyContact)
      notify('Cadastro salvo.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível salvar o cadastro.')
    }
  }

  function saveContactDetails() {
    if (!contactForm.id) {
      notify('Selecione um contato capturado do grupo para editar.')
      return
    }
    if (!contactForm.whatsapp.trim()) {
      notify('Informe o WhatsApp do contato.')
      return
    }
    if (!isValidWhatsapp(contactForm.whatsapp)) {
      notify('Informe um WhatsApp válido com DDD.')
      return
    }
    if (contactForm.email.trim() && !isValidEmail(contactForm.email)) {
      notify('Informe um e-mail válido para o contato.')
      return
    }
    const record = autofillInternalContact({ ...contactForm, whatsapp: formatWhatsapp(contactForm.whatsapp), email: contactForm.email.trim().toLowerCase() })
    setClientGroupForm({ ...clientGroupForm, contatos: clientGroupForm.contatos.map((item) => item.id === record.id ? record : item) })
    setContactForm(emptyContact)
  }

  function editContact(contact: GroupContact) {
    setContactForm(contact)
  }

  function renderUsers() {
    return (
      <main className="content-shell">
        <SectionHeader eyebrow="Cadastros" title="Usuários" description="Controle de acessos internos do Agent CrossDo." />
        <div className="toolbar">
          <div className="search-box"><Search size={18} /><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar usuário" aria-label="Buscar usuário" /></div>
          <button className="primary-button" type="button" onClick={() => setUserForm(emptyUser)}><Plus size={16} /> Novo usuário</button>
        </div>
        <div className="card table-card">
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>Setor</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>{filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.nome}</td><td>{user.email}</td><td>{user.whatsapp || '—'}</td><td>{user.setor}</td>
                <td><span className="pill dark">{user.protegido ? 'Administrador' : user.perfil}</span></td>
                <td><button className={`pill status ${user.status === 'Ativo' ? 'success' : 'neutral'}`} type="button" onClick={() => toggleUserStatus(user)}>{user.status}</button></td>
                <td><div className="row-actions"><button type="button" title="Editar" onClick={() => editUser(user)} disabled={user.protegido}><Edit3 size={15} /></button><button type="button" title="Resetar senha" onClick={() => resetUserPassword(user)} disabled={user.protegido}><KeyRound size={15} /></button><button type="button" title="Remover" onClick={() => deleteUser(user.id)} disabled={user.protegido}><Trash2 size={15} /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <form className="card record-form" onSubmit={saveUser}>
          <h3>{userForm.id ? 'Editar usuário' : 'Novo usuário'}</h3>
          <label><span>Nome</span><input value={userForm.nome} onChange={(event) => setUserForm({ ...userForm, nome: event.target.value })} /></label>
          <label><span>E-mail</span><input type="email" inputMode="email" autoComplete="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value.trim().toLowerCase() })} /></label>
          <label><span>WhatsApp</span><input inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999" value={userForm.whatsapp} onChange={(event) => setUserForm({ ...userForm, whatsapp: formatWhatsapp(event.target.value) })} /></label>
          <label><span>Setor/Função</span><input value={userForm.setor} onChange={(event) => setUserForm({ ...userForm, setor: event.target.value })} /></label>
          <label><span>Perfil</span><select value={userForm.perfil} onChange={(event) => setUserForm({ ...userForm, perfil: event.target.value as UserRecord['perfil'] })}><option>Administrador</option><option>Atendimento</option></select></label>
          <label><span>Status</span><select value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value as Status })}><option>Ativo</option><option>Inativo</option></select></label>
          <div className="form-actions span-2"><button className="secondary-button" type="button" onClick={() => setUserForm(emptyUser)}>Limpar</button><button className="primary-button" type="submit"><Save size={16} /> Salvar</button></div>
        </form>
      </main>
    )
  }

  function renderClientGroups() {
    return (
      <main className="content-shell">
        <SectionHeader eyebrow="Cadastros" title="Clientes/Grupos" description="Cadastro único do cliente, grupo de WhatsApp e contatos identificados no grupo." />
        <div className="toolbar">
          <div className="search-box"><Search size={18} /><input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Buscar por cliente, grupo ou ID" /></div>
          <span className="sync-badge">Grupos criados automaticamente pelo n8n</span>
        </div>
        <div className="card table-card spaced-card">
          <table>
            <thead><tr><th>Grupo</th><th>ID do grupo</th><th>Cliente</th><th>Unidade</th><th>Contatos</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>{filteredClientGroups.length === 0 ? <tr><td colSpan={7}>Nenhum cadastro encontrado.</td></tr> : filteredClientGroups.map((record) => (
              <tr key={record.id}>
                <td>{record.nomeGrupo}</td><td>{record.idGrupo}</td><td>{record.nomeCliente || 'Pendente'}</td><td>{record.unidade}</td><td>{record.contatos.length}</td>
                <td><span className={`pill ${record.statusGrupo === 'Ativo' ? 'success' : 'neutral'}`}>{record.statusGrupo}</span></td>
                <td><div className="row-actions"><button type="button" title="Completar cadastro" onClick={() => setClientGroupForm(record)}><Edit3 size={15} /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <form className="card record-form" onSubmit={saveClientGroup}>
          <h3>{clientGroupForm.id ? 'Editar grupo/cliente' : 'Selecione um grupo identificado'}</h3>
          <label><span>Nome do grupo</span><input value={clientGroupForm.nomeGrupo} readOnly /></label>
          <label><span>ID do grupo</span><input value={clientGroupForm.idGrupo} readOnly /></label>
          <label><span>Status do grupo</span><input value={clientGroupForm.statusGrupo} readOnly /></label>
          <label><span>Nome do cliente</span><input value={clientGroupForm.nomeCliente} onChange={(event) => setClientGroupForm({ ...clientGroupForm, nomeCliente: event.target.value })} /></label>
          <label><span>CNPJ</span><input inputMode="numeric" placeholder="00.000.000/0000-00" value={clientGroupForm.documento} onChange={(event) => setClientGroupForm({ ...clientGroupForm, documento: formatCnpj(event.target.value) })} /></label>
          <label><span>Unidade</span><select value={clientGroupForm.unidade} onChange={(event) => setClientGroupForm({ ...clientGroupForm, unidade: event.target.value })}><option>Nova Lima/MG</option><option>Barueri/SP</option><option>Todas</option></select></label>
          <label><span>Responsável do cliente</span><input value={clientGroupForm.responsavelCliente} onChange={(event) => setClientGroupForm({ ...clientGroupForm, responsavelCliente: event.target.value })} /></label>
          <label><span>E-mail do responsável</span><input type="email" inputMode="email" autoComplete="email" value={clientGroupForm.emailResponsavel} onChange={(event) => setClientGroupForm({ ...clientGroupForm, emailResponsavel: event.target.value.trim().toLowerCase() })} /></label>
          <label><span>WhatsApp do responsável</span><input inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999" value={clientGroupForm.telefoneResponsavel} onChange={(event) => setClientGroupForm({ ...clientGroupForm, telefoneResponsavel: formatWhatsapp(event.target.value) })} /></label>
          <div className="span-2 wms-box">
            <div className="feature-box-header"><strong>Integração WMS e-Ship</strong><span className="sync-badge">Credencial por cliente</span></div>
            <div className="wms-fields">
              <label><span>Usuário da API key e-Ship</span><input placeholder="Usuário/identificador usado no WMS" value={clientGroupForm.wmsApiKeyUsuario} onChange={(event) => setClientGroupForm({ ...clientGroupForm, wmsApiKeyUsuario: event.target.value })} /></label>
              <label><span>API key/token WMS e-Ship</span><input type="password" autoComplete="off" placeholder={clientGroupForm.wmsApiKeySet ? 'Token já configurado — preencher para substituir' : 'Cole a API key do cliente'} value={clientGroupForm.wmsApiKey} onChange={(event) => setClientGroupForm({ ...clientGroupForm, wmsApiKey: event.target.value })} /></label>
            </div>
            <div className="secret-note">A API key fica salva apenas no backend para o agente consultar o WMS com o acesso correto do cliente. Ela não é exibida novamente na tela.</div>
          </div>
          <div className="span-2 activation-box"><div className="feature-box-header"><strong>Status e ativação operacional</strong><span className="sync-badge">Dados do n8n + validação humana</span></div><div className="status-grid"><div className="status-item"><span>Grupo identificado no n8n</span><strong>{clientGroupForm.id ? 'Sim' : 'Não'}</strong><small>Se apareceu nesta tela, o grupo já foi capturado pelo fluxo.</small></div><div className="status-item"><span>WhatsApp do Cross Agent no grupo</span><strong>{clientGroupForm.crossAgentAdicionado ? 'Confirmado' : 'Não confirmado'}</strong><small>Informativo, atualizado automaticamente pelo n8n/participantes do grupo.</small></div></div><label className="check-label"><input type="checkbox" checked={clientGroupForm.demandaMonitorada} onChange={(event) => setClientGroupForm({ ...clientGroupForm, demandaMonitorada: event.target.checked })} /><span>Ativar monitoramento para começar a capturar dados</span></label><label className="check-label muted-control"><input type="checkbox" checked={clientGroupForm.agentAtivo} disabled={!clientGroupForm.crossAgentAdicionado} onChange={(event) => setClientGroupForm({ ...clientGroupForm, agentAtivo: event.target.checked })} /><span>Ativar Cross Agent neste grupo</span></label>{!clientGroupForm.crossAgentAdicionado && <p className="muted">A ativação do Cross Agent fica bloqueada até o n8n confirmar que o número do agente está no grupo.</p>}</div>
          <div className="span-2 feature-box"><div className="feature-box-header"><strong>Permissões do Cross Agent</strong><button className="secondary-button" type="button" disabled={FUNCIONALIDADES_AGENT.length === 0 || !clientGroupForm.agentAtivo} onClick={() => setClientGroupForm({ ...clientGroupForm, funcionalidades: clientGroupForm.funcionalidades.length === FUNCIONALIDADES_AGENT.length ? [] : FUNCIONALIDADES_AGENT })}>{clientGroupForm.funcionalidades.length === FUNCIONALIDADES_AGENT.length && FUNCIONALIDADES_AGENT.length > 0 ? 'Desmarcar todas' : 'Selecionar todas'}</button></div>{FUNCIONALIDADES_AGENT.length === 0 ? <p className="muted">Nenhuma permissão do Cross Agent cadastrada ainda. A lista será preenchida quando as funcionalidades forem criadas.</p> : FUNCIONALIDADES_AGENT.map((feature) => <label className="check-label" key={feature}><input type="checkbox" disabled={!clientGroupForm.agentAtivo} checked={clientGroupForm.funcionalidades.includes(feature)} onChange={(event) => setClientGroupForm({ ...clientGroupForm, funcionalidades: event.target.checked ? [...clientGroupForm.funcionalidades, feature] : clientGroupForm.funcionalidades.filter((item) => item !== feature) })} /><span>{feature}</span></label>)}</div>
          <label className="span-2"><span>Observações informativas</span><textarea value={clientGroupForm.observacoes} onChange={(event) => setClientGroupForm({ ...clientGroupForm, observacoes: event.target.value })} /></label>
          <div className="contact-panel span-2">
            <h4>Contatos do grupo</h4><p className="muted">Lista atualizada automaticamente a partir dos participantes capturados no n8n. Complete nome, função, e-mail e tipo quando necessário.</p>
            <div className="contact-list">
              {clientGroupForm.contatos.length === 0 ? <p className="muted">Nenhum contato cadastrado.</p> : clientGroupForm.contatos.map((contact) => (
                <div className="contact-row" key={contact.id}>
                  <span>{contact.nome || 'Sem nome'}</span><span>{contact.funcao || '—'}</span><span>{contact.whatsapp}</span><span>{contact.email || '—'}</span><span className="pill dark">{contact.tipo}</span>
                  <div className="row-actions"><button type="button" title="Editar contato" onClick={() => editContact(contact)}><Edit3 size={14} /></button></div>
                </div>
              ))}
            </div>
          </div>
          <div className="contact-form span-2">
            <label><span>WhatsApp</span><input inputMode="tel" autoComplete="tel" value={contactForm.whatsapp} readOnly /></label>
            <label><span>Tipo</span><select value={contactForm.tipo} onChange={(event) => setContactForm(autofillInternalContact({ ...contactForm, tipo: event.target.value as ContactType }))}><option>Não definido</option><option>Interno</option><option>Externo</option></select></label>
            <label><span>Nome</span><input value={contactForm.nome} onChange={(event) => setContactForm({ ...contactForm, nome: event.target.value })} /></label>
            <label><span>Função</span><input value={contactForm.funcao} onChange={(event) => setContactForm({ ...contactForm, funcao: event.target.value })} /></label>
            <label><span>E-mail</span><input type="email" inputMode="email" autoComplete="email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value.trim().toLowerCase() })} /></label>
            <button className="secondary-button" type="button" onClick={saveContactDetails} disabled={!contactForm.id}><Save size={16} /> Salvar contato</button>
          </div>
          <div className="form-actions span-2"><button className="secondary-button" type="button" onClick={() => { setClientGroupForm(emptyClientGroup); setContactForm(emptyContact) }}>Cancelar edição</button><button className="primary-button" type="submit" disabled={!clientGroupForm.id}><Save size={16} /> Salvar cadastro</button></div>
        </form>
      </main>
    )
  }

  function renderDashboard() {
    return (
      <main className="content-shell">
        <SectionHeader eyebrow="Painel operacional" title="Dashboard Agent CrossDo" description="Visão inicial dos cadastros e vínculos operacionais do Cross Agent." />
        <div className="stats-grid">{stats.map((stat) => <article className={`stat-card ${stat.tone}`} key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.hint}</small></article>)}</div>
        <div className="dashboard-grid">
          <article className="card"><div className="card-title"><LayoutDashboard size={20} /><h3>Módulos ativos</h3></div><ul className="timeline"><li><strong>Usuários:</strong> controle de acesso interno.</li><li><strong>Clientes/Grupos:</strong> cadastro único por grupo identificado.</li><li><strong>Contatos:</strong> classificação de participantes internos e externos.</li></ul></article>
          <article className="card"><div className="card-title"><Building2 size={20} /><h3>Ações rápidas</h3></div><div className="quick-actions stacked"><button type="button" onClick={() => setScreen('clientesGrupos')}>Abrir clientes/grupos</button><button type="button" onClick={() => setScreen('usuarios')}>Gerenciar usuários</button></div></article>
        </div>
      </main>
    )
  }

  function renderContent() {
    if (screen === 'usuarios') return renderUsers()
    if (screen === 'clientesGrupos') return renderClientGroups()
    return renderDashboard()
  }

  if (!authenticated) {
    return (
      <div className="login-page">
        <section className="login-brand"><img className="login-logo" src="/brand/logo-icon.png" alt="CrossDo" /><p>Portal de atendimento e auditoria</p><h1>Agent CrossDo</h1></section>
        <form className="login-card" onSubmit={handleLogin}>
          <div><p className="eyebrow">Acesso restrito</p><span className="login-subtitle">Acesse com seu e-mail e senha</span></div>
          <label htmlFor="login-email"><span>E-mail</span><input id="login-email" name="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" autoComplete="username email" /></label>
          <label htmlFor="login-password"><span>Senha</span><input id="login-password" name="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" autoComplete="current-password" autoFocus /></label>
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="primary-button full" type="submit">Entrar</button>
          <button className="secondary-button full" type="button" onClick={handleForgotPassword}>Esqueci minha senha</button>
        </form>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand"><img className="sidebar-logo" src="/brand/logo-icon.png" alt="CrossDo" /><div><strong>Agent CrossDo</strong><span>Cross Agent</span></div></div>
        <nav className="side-nav"><button className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')}><Home size={18} /> <span>Dashboard</span></button><button className="nav-parent" onClick={() => setCadastrosOpen(!cadastrosOpen)}><Users size={18} /> <span>Cadastros</span> <ChevronDown size={16} className={cadastrosOpen ? 'rotate' : ''} /></button>{cadastrosOpen && <div className="submenu"><button className={screen === 'usuarios' ? 'active' : ''} onClick={() => setScreen('usuarios')}><UserCog size={17} /> <span>Usuários</span></button><button className={screen === 'clientesGrupos' ? 'active' : ''} onClick={() => setScreen('clientesGrupos')}><Building2 size={17} /> <span>Clientes/Grupos</span></button></div>}</nav>
      </aside>
      <section className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Alternar menu"><Menu size={20} /></button><div><strong>Agent CrossDo</strong><span>Nome: Henrique Andrade • Setor: Diretoria / Cross Agent</span></div></div><div className="topbar-actions"><button title="Ajuda" type="button" onClick={() => window.open('https://github.com/henriqueandrade142-cell/agent-crossdo-app', '_blank', 'noopener,noreferrer')}><HelpCircle size={17} /> <span>Ajuda</span></button><button title="Atualizar" type="button" onClick={() => window.location.reload()}><RefreshCw size={17} /> <span>Atualizar</span></button><button title="Trocar senha" type="button" onClick={() => notify('Solicitação registrada.')}><KeyRound size={17} /> <span>Trocar senha</span></button><button title="Sair" type="button" onClick={() => setAuthenticated(false)}><LogOut size={17} /> <span>Sair</span></button></div></header>{flash && <div className="flash-message">{flash}</div>}{renderContent()}</section>
    </div>
  )
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>
}

export default App
