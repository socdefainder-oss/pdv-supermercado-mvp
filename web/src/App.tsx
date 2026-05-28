import { useEffect, useRef, useState } from 'react';
import { Banknote, BarChart3, Boxes, ClipboardList, CreditCard, LayoutDashboard, LogOut, Megaphone, PackagePlus, ScanLine, Search, ShieldCheck, ShoppingCart, Truck, Users, Warehouse } from 'lucide-react';
import { api, clearToken, money, setToken, stockNumber, toCents } from './api';
import type { CartItem, CashRegister, Category, DiscountType, PaymentMethod, Product, Sale, Unit, User } from './types';
import { AuditPage, CommercialPage, EntitiesPage, ManagementDashboard, PurchasesPage, ReportsPlusPage, StockPage } from './AdminPages';

type View = 'dashboard' | 'pos' | 'products' | 'cash' | 'reports' | 'users' | 'entities' | 'stock' | 'purchases' | 'commercial' | 'audit';

type Notice = { type: 'ok' | 'error'; text: string } | null;

const units: Unit[] = ['UN', 'KG', 'CX', 'LT', 'ML', 'PCT'];
const paymentLabels: Record<PaymentMethod, string> = { CASH: 'Dinheiro', DEBIT_CARD: 'Debito', CREDIT_CARD: 'Credito', PIX: 'Pix' };

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    api<{ user: User }>('/auth/me').then((response) => setUser(response.user)).catch(() => clearToken());
  }, []);

  if (!user) return <LoginPage onLogin={(loggedUser) => setUser(loggedUser)} />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dce8d7,transparent_34%),linear-gradient(135deg,#f7f4ea,#edf1e9)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white/90 p-4 lg:block">
        <div className="mb-6 rounded-lg bg-ink p-4 text-white">
          <p className="font-display text-xl font-bold">PDV Mercado</p>
          <p className="text-sm text-white/70">{user.name}</p>
        </div>
        <nav className="space-y-2">
          <NavButton icon={<LayoutDashboard size={18} />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavButton icon={<ShoppingCart size={18} />} label="PDV" active={view === 'pos'} onClick={() => setView('pos')} />
          <NavButton icon={<PackagePlus size={18} />} label="Produtos" active={view === 'products'} onClick={() => setView('products')} />
          {user.role === 'ADMIN' && <NavButton icon={<ClipboardList size={18} />} label="Cadastros" active={view === 'entities'} onClick={() => setView('entities')} />}
          {user.role === 'ADMIN' && <NavButton icon={<Warehouse size={18} />} label="Estoque" active={view === 'stock'} onClick={() => setView('stock')} />}
          <NavButton icon={<Banknote size={18} />} label="Caixa" active={view === 'cash'} onClick={() => setView('cash')} />
          {user.role === 'ADMIN' && <NavButton icon={<Truck size={18} />} label="Compras" active={view === 'purchases'} onClick={() => setView('purchases')} />}
          {user.role === 'ADMIN' && <NavButton icon={<Megaphone size={18} />} label="Comercial" active={view === 'commercial'} onClick={() => setView('commercial')} />}
          {user.role === 'ADMIN' && <NavButton icon={<BarChart3 size={18} />} label="Relatorios" active={view === 'reports'} onClick={() => setView('reports')} />}
          {user.role === 'ADMIN' && <NavButton icon={<Users size={18} />} label="Usuarios" active={view === 'users'} onClick={() => setView('users')} />}
          {user.role === 'ADMIN' && <NavButton icon={<ShieldCheck size={18} />} label="Auditoria" active={view === 'audit'} onClick={() => setView('audit')} />}
          <button className="btn-secondary w-full" onClick={() => { clearToken(); setUser(null); }}><LogOut size={18} />Sair</button>
        </nav>
      </aside>
      <div className="sticky top-0 z-10 border-b border-line bg-white/95 p-3 shadow-sm lg:hidden">
        <div className="mb-2 flex items-center justify-between">
          <strong className="font-display">PDV Mercado</strong>
          <button className="btn-secondary px-3" onClick={() => { clearToken(); setUser(null); }}><LogOut size={16} />Sair</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <NavButton icon={<LayoutDashboard size={16} />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavButton icon={<ShoppingCart size={16} />} label="PDV" active={view === 'pos'} onClick={() => setView('pos')} />
          <NavButton icon={<PackagePlus size={16} />} label="Produtos" active={view === 'products'} onClick={() => setView('products')} />
          {user.role === 'ADMIN' && <NavButton icon={<ClipboardList size={16} />} label="Cadastros" active={view === 'entities'} onClick={() => setView('entities')} />}
          {user.role === 'ADMIN' && <NavButton icon={<Warehouse size={16} />} label="Estoque" active={view === 'stock'} onClick={() => setView('stock')} />}
          <NavButton icon={<Banknote size={16} />} label="Caixa" active={view === 'cash'} onClick={() => setView('cash')} />
          {user.role === 'ADMIN' && <NavButton icon={<Truck size={16} />} label="Compras" active={view === 'purchases'} onClick={() => setView('purchases')} />}
          {user.role === 'ADMIN' && <NavButton icon={<Megaphone size={16} />} label="Comercial" active={view === 'commercial'} onClick={() => setView('commercial')} />}
          {user.role === 'ADMIN' && <NavButton icon={<BarChart3 size={16} />} label="Relatorios" active={view === 'reports'} onClick={() => setView('reports')} />}
          {user.role === 'ADMIN' && <NavButton icon={<Users size={16} />} label="Usuarios" active={view === 'users'} onClick={() => setView('users')} />}
          {user.role === 'ADMIN' && <NavButton icon={<ShieldCheck size={16} />} label="Auditoria" active={view === 'audit'} onClick={() => setView('audit')} />}
        </div>
      </div>
      <main className="p-4 lg:ml-64 lg:p-6">
        {notice && <div className={`mb-4 rounded-md px-4 py-3 text-sm ${notice.type === 'ok' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>{notice.text}</div>}
        {view === 'dashboard' && (user.role === 'ADMIN' ? <ManagementDashboard /> : <Dashboard setView={setView} />)}
        {view === 'pos' && <PosPage user={user} notify={setNotice} />}
        {view === 'products' && <ProductsPage user={user} notify={setNotice} />}
        {view === 'entities' && user.role === 'ADMIN' && <EntitiesPage notify={setNotice} />}
        {view === 'stock' && user.role === 'ADMIN' && <StockPage notify={setNotice} />}
        {view === 'cash' && <CashPage notify={setNotice} />}
        {view === 'purchases' && user.role === 'ADMIN' && <PurchasesPage notify={setNotice} />}
        {view === 'commercial' && user.role === 'ADMIN' && <CommercialPage notify={setNotice} />}
        {view === 'reports' && user.role === 'ADMIN' && <ReportsPlusPage notify={setNotice} />}
        {view === 'users' && user.role === 'ADMIN' && <UsersPage notify={setNotice} />}
        {view === 'audit' && user.role === 'ADMIN' && <AuditPage />}
      </main>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('admin@supermercado.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const response = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(response.token);
      onLogin(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel entrar.');
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(120deg,#17211f,#315c4f_52%,#f7f4ea_52%)] p-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-lg border border-white/60 p-8 shadow-2xl">
        <h1 className="font-display text-3xl font-bold text-ink">PDV Supermercado</h1>
        <p className="mt-1 text-sm text-ink/70">Operacao interna, estoque e caixa.</p>
        <label className="mt-6 block text-sm font-semibold">E-mail</label>
        <input className="field mt-1" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label className="mt-4 block text-sm font-semibold">Senha</label>
        <input className="field mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-900">{error}</p>}
        <button className="btn-primary mt-6 w-full" type="submit">Entrar</button>
      </form>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={`btn w-full justify-start ${active ? 'bg-moss text-white' : 'bg-transparent text-ink hover:bg-paper'}`} onClick={onClick}>{icon}{label}</button>;
}

function Dashboard({ setView }: { setView: (view: View) => void }) {
  return (
    <section>
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ActionCard icon={<ScanLine />} title="Abrir PDV" text="Bipar produtos, aplicar desconto e receber." onClick={() => setView('pos')} />
        <ActionCard icon={<Boxes />} title="Produtos" text="Cadastro, estoque minimo e codigos." onClick={() => setView('products')} />
        <ActionCard icon={<Banknote />} title="Caixa" text="Abrir, suprir, sangrar e fechar." onClick={() => setView('cash')} />
      </div>
    </section>
  );
}

function ActionCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return <button onClick={onClick} className="panel p-5 text-left transition hover:-translate-y-0.5 hover:border-moss"><div className="mb-4 text-moss">{icon}</div><p className="font-display text-xl font-bold">{title}</p><p className="mt-2 text-sm text-ink/70">{text}</p></button>;
}

function ProductsPage({ user, notify }: { user: User; notify: (notice: Notice) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', barcode: '', categoryId: '', unit: 'UN' as Unit, cost: '', price: '', stock: '', minStock: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const [productData, categoryData] = await Promise.all([api<Product[]>(`/products?search=${encodeURIComponent(search)}`), api<Category[]>('/categories')]);
    setProducts(productData);
    setCategories(categoryData);
    setForm((current) => ({ ...current, categoryId: current.categoryId || categoryData[0]?.id || '' }));
  }

  useEffect(() => { load().catch((error) => notify({ type: 'error', text: error.message })); }, [search]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = { name: form.name, barcode: form.barcode, categoryId: form.categoryId, unit: form.unit, costPriceCents: toCents(form.cost), salePriceCents: toCents(form.price), stockQuantity: Number(form.stock), minStock: Number(form.minStock) };
    await api<Product>(editingId ? `/products/${editingId}` : '/products', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
    notify({ type: 'ok', text: editingId ? 'Produto atualizado.' : 'Produto cadastrado.' });
    setForm({ name: '', barcode: '', categoryId: categories[0]?.id || '', unit: 'UN', cost: '', price: '', stock: '', minStock: '' });
    setEditingId(null);
    await load();
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setForm({ name: product.name, barcode: product.barcode, categoryId: product.categoryId, unit: product.unit, cost: String(product.costPriceCents / 100), price: String(product.salePriceCents / 100), stock: String(product.stockQuantity), minStock: String(product.minStock) });
  }

  async function deactivateProduct(id: string) {
    await api(`/products/${id}/deactivate`, { method: 'PATCH' });
    notify({ type: 'ok', text: 'Produto inativado.' });
    await load();
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold">Produtos</h1><div className="relative"><Search className="absolute left-3 top-2.5" size={16} /><input className="field pl-9" placeholder="Buscar nome ou codigo" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
      {user.role === 'ADMIN' && <form onSubmit={save} className="panel mt-5 grid gap-3 p-4 md:grid-cols-4"><input className="field" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><input className="field" placeholder="Codigo de barras" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} required /><select className="field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select><input className="field" placeholder="Custo" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /><input className="field" placeholder="Venda" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /><input className="field" placeholder="Estoque" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /><input className="field" placeholder="Minimo" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} required /><button className="btn-primary md:col-span-3">{editingId ? 'Salvar alteracoes' : 'Cadastrar produto'}</button>{editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm({ name: '', barcode: '', categoryId: categories[0]?.id || '', unit: 'UN', cost: '', price: '', stock: '', minStock: '' }); }}>Cancelar edicao</button>}</form>}
      <div className="panel mt-5 overflow-auto"><table className="w-full min-w-[860px]"><thead className="bg-paper"><tr><th className="table-cell">Produto</th><th className="table-cell">Codigo</th><th className="table-cell">Categoria</th><th className="table-cell">Venda</th><th className="table-cell">Estoque</th><th className="table-cell">Status</th><th className="table-cell">Acoes</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-line"><td className="table-cell font-semibold">{product.name}</td><td className="table-cell">{product.barcode}</td><td className="table-cell">{product.category?.name}</td><td className="table-cell">{money(product.salePriceCents)}</td><td className={`table-cell ${stockNumber(product.stockQuantity) <= stockNumber(product.minStock) ? 'font-bold text-danger' : ''}`}>{String(product.stockQuantity)} {product.unit}</td><td className="table-cell">{product.active ? 'Ativo' : 'Inativo'}</td><td className="table-cell"><div className="flex gap-2"><button className="btn-secondary px-3" onClick={() => editProduct(product)}>Editar</button>{product.active && <button className="btn-danger px-3" onClick={() => deactivateProduct(product.id).catch((error) => notify({ type: 'error', text: error.message }))}>Inativar</button>}</div></td></tr>)}</tbody></table></div>
    </section>
  );
}

function CashPage({ notify }: { notify: (notice: Notice) => void }) {
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [amount, setAmount] = useState('100');
  const [movement, setMovement] = useState({ amount: '', reason: '' });
  const [summary, setSummary] = useState<any>(null);

  async function load() {
    const current = await api<CashRegister | null>('/cash-register/current');
    setCashRegister(current);
    if (current) setSummary(await api(`/cash-register/${current.id}/summary`));
  }
  useEffect(() => { load().catch((error) => notify({ type: 'error', text: error.message })); }, []);

  async function openCash() { await api('/cash-register/open', { method: 'POST', body: JSON.stringify({ openingAmountCents: toCents(amount) }) }); notify({ type: 'ok', text: 'Caixa aberto.' }); await load(); }
  async function move(type: 'supply' | 'withdraw') { if (!cashRegister) return; await api(`/cash-register/${cashRegister.id}/${type}`, { method: 'POST', body: JSON.stringify({ amountCents: toCents(movement.amount), reason: movement.reason || (type === 'supply' ? 'Suprimento' : 'Sangria') }) }); notify({ type: 'ok', text: type === 'supply' ? 'Suprimento registrado.' : 'Sangria registrada.' }); setMovement({ amount: '', reason: '' }); await load(); }
  async function closeCash() { if (!cashRegister) return; await api(`/cash-register/${cashRegister.id}/close`, { method: 'POST', body: JSON.stringify({ closingAmountCents: toCents(amount) }) }); notify({ type: 'ok', text: 'Caixa fechado.' }); setCashRegister(null); setSummary(null); }

  return <section><h1 className="font-display text-3xl font-bold">Caixa</h1>{!cashRegister ? <div className="panel mt-5 max-w-md p-5"><label className="text-sm font-semibold">Valor inicial</label><input className="field mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} /><button className="btn-primary mt-4 w-full" onClick={openCash}>Abrir caixa</button></div> : <div className="mt-5 grid gap-4 lg:grid-cols-3"><div className="panel p-5"><p className="font-bold">Caixa aberto</p><p className="text-sm text-ink/70">Aberto em {new Date(cashRegister.openedAt).toLocaleString('pt-BR')}</p><p className="mt-4 text-2xl font-bold">{money(summary?.expectedCashCents ?? cashRegister.openingAmountCents)}</p><p className="text-sm text-ink/60">Dinheiro esperado</p></div><div className="panel p-5"><input className="field" placeholder="Valor" value={movement.amount} onChange={(e) => setMovement({ ...movement, amount: e.target.value })} /><input className="field mt-3" placeholder="Motivo" value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })} /><div className="mt-3 flex gap-2"><button className="btn-secondary flex-1" onClick={() => move('supply')}>Suprimento</button><button className="btn-danger flex-1" onClick={() => move('withdraw')}>Sangria</button></div></div><div className="panel p-5"><input className="field" placeholder="Dinheiro contado" value={amount} onChange={(e) => setAmount(e.target.value)} /><button className="btn-primary mt-3 w-full" onClick={closeCash}>Fechar caixa</button></div></div>}</section>;
}

function PosPage({ user, notify }: { user: User; notify: (notice: Notice) => void }) {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [payments, setPayments] = useState<{ method: PaymentMethod; amount: string }[]>([{ method: 'CASH', amount: '' }]);

  const gross = cart.reduce((sum, item) => sum + Math.round(item.product.salePriceCents * item.quantity), 0);
  const discount = discountType === 'FIXED' ? Math.min(toCents(discountValue), gross) : discountType === 'PERCENTAGE' ? Math.min(Math.round(gross * (Number(discountValue) / 100 || 0)), gross) : 0;
  const total = Math.max(0, gross - discount);
  const paid = payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
  const change = Math.max(0, paid - total);

  async function loadCurrentCash() { setCashRegister(await api<CashRegister | null>('/cash-register/current')); }
  useEffect(() => { loadCurrentCash().catch((error) => notify({ type: 'error', text: error.message })); barcodeRef.current?.focus(); }, []);
  useEffect(() => { api<{ id: string; name: string }[]>('/entities/customers').then(setCustomers).catch(() => setCustomers([])); }, []);
  useEffect(() => { if (search.length > 1) api<Product[]>(`/products?search=${encodeURIComponent(search)}`).then(setProducts).catch(() => setProducts([])); }, [search]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'F2') { event.preventDefault(); barcodeRef.current?.focus(); } if (event.key === 'F6') { event.preventDefault(); finalize().catch((error) => notify({ type: 'error', text: error.message })); } if (event.key === 'Escape') setCart([]); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); });

  function addProduct(product: Product) {
    if (!product.active) return notify({ type: 'error', text: 'Produto inativo.' });
    if (stockNumber(product.stockQuantity) <= 0) return notify({ type: 'error', text: 'Produto sem estoque disponivel.' });
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, stockNumber(product.stockQuantity)) } : item);
      return [...current, { product, quantity: 1 }];
    });
    setBarcode('');
    barcodeRef.current?.focus();
  }

  async function scan(event: React.FormEvent) {
    event.preventDefault();
    try { addProduct(await api<Product>(`/products/barcode/${barcode}`)); } catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Produto nao encontrado.' }); }
  }

  async function finalize() {
    if (!cashRegister) throw new Error('Abra o caixa antes de vender.');
    if (!cart.length) throw new Error('Inclua produtos no carrinho.');
    if (paid < total) throw new Error('Pagamento menor que o total.');
    await api<Sale>('/sales', { method: 'POST', body: JSON.stringify({ customerId: customerId || undefined, items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })), discountType, discountValue: Number(discountValue || 0), payments: payments.map((payment) => ({ method: payment.method, amountCents: toCents(payment.amount) })) }) });
    notify({ type: 'ok', text: 'Venda concluida e estoque baixado.' });
    setCart([]); setDiscountType('NONE'); setDiscountValue(''); setPayments([{ method: 'CASH', amount: '' }]);
    barcodeRef.current?.focus();
  }

  return <section><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold">PDV</h1><div className="rounded-md bg-white px-3 py-2 text-sm shadow-sm">{cashRegister ? `Caixa aberto: ${cashRegister.id.slice(-6)}` : 'Sem caixa aberto'} | {user.name}</div></div><div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.4fr_0.9fr]"><div className="space-y-4"><div className="panel p-4"><label className="text-sm font-semibold">Cliente opcional</label><select className="field mt-1" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Consumidor nao identificado</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div><form onSubmit={scan} className="panel p-4"><label className="text-sm font-semibold">Codigo de barras</label><input ref={barcodeRef} className="field mt-1 text-lg" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Bipe ou digite e pressione Enter" /></form><div className="panel p-4"><input className="field" placeholder="Buscar produto por nome" value={search} onChange={(e) => setSearch(e.target.value)} /> <div className="mt-3 max-h-72 space-y-2 overflow-auto">{products.map((product) => <button key={product.id} onClick={() => addProduct(product)} className="w-full rounded-md border border-line p-3 text-left hover:border-moss"><b>{product.name}</b><br /><span className="text-sm text-ink/60">{product.barcode} | {money(product.salePriceCents)} | est. {String(product.stockQuantity)}</span></button>)}</div></div></div><div className="panel overflow-hidden"><table className="w-full"><thead className="bg-paper"><tr><th className="table-cell">Item</th><th className="table-cell">Qtd</th><th className="table-cell">Unit.</th><th className="table-cell">Subtotal</th><th className="table-cell"></th></tr></thead><tbody>{cart.map((item) => <tr key={item.product.id} className="border-t border-line"><td className="table-cell font-semibold">{item.product.name}</td><td className="table-cell"><div className="flex items-center gap-2"><button className="btn-secondary px-2" onClick={() => setCart(cart.map((row) => row.product.id === item.product.id ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row))}>-</button>{item.quantity}<button className="btn-secondary px-2" onClick={() => setCart(cart.map((row) => row.product.id === item.product.id ? { ...row, quantity: Math.min(stockNumber(row.product.stockQuantity), row.quantity + 1) } : row))}>+</button></div></td><td className="table-cell">{money(item.product.salePriceCents)}</td><td className="table-cell">{money(Math.round(item.product.salePriceCents * item.quantity))}</td><td className="table-cell"><button className="btn-danger px-2" onClick={() => setCart(cart.filter((row) => row.product.id !== item.product.id))}>Remover</button></td></tr>)}</tbody></table></div><div className="panel p-5"><p className="text-sm text-ink/60">Total bruto</p><p className="text-2xl font-bold">{money(gross)}</p><div className="mt-4 grid grid-cols-2 gap-2"><select className="field" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}><option value="NONE">Sem desconto</option><option value="FIXED">R$</option><option value="PERCENTAGE">%</option></select><input className="field" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="Desconto" /></div><p className="mt-4 text-sm text-ink/60">Desconto: {money(discount)}</p><p className="mt-1 text-3xl font-black text-moss">{money(total)}</p><div className="mt-5 space-y-2">{payments.map((payment, index) => <div key={index} className="grid grid-cols-2 gap-2"><select className="field" value={payment.method} onChange={(e) => setPayments(payments.map((row, rowIndex) => rowIndex === index ? { ...row, method: e.target.value as PaymentMethod } : row))}>{Object.entries(paymentLabels).map(([method, label]) => <option key={method} value={method}>{label}</option>)}</select><input className="field" value={payment.amount} onChange={(e) => setPayments(payments.map((row, rowIndex) => rowIndex === index ? { ...row, amount: e.target.value } : row))} placeholder="Valor" /></div>)}</div><button className="btn-secondary mt-2 w-full" onClick={() => setPayments([...payments, { method: paymentMethod, amount: '' }])}><CreditCard size={16} />Pagamento misto</button><select className="field mt-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>{Object.entries(paymentLabels).map(([method, label]) => <option key={method} value={method}>{label}</option>)}</select><p className="mt-3 text-sm">Pago: {money(paid)} | Troco: {money(change)}</p><button className="btn-primary mt-4 w-full py-3" onClick={() => finalize().catch((error) => notify({ type: 'error', text: error.message }))}>Finalizar venda</button><button className="btn-danger mt-2 w-full" onClick={() => { setCart([]); notify({ type: 'ok', text: 'Venda cancelada.' }); }}>Cancelar venda</button></div></div></section>;
}

function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  useEffect(() => { Promise.all([api<Sale[]>('/reports/sales-today'), api<Product[]>('/reports/low-stock'), api<any[]>('/reports/top-products')]).then(([saleData, stockData, topData]) => { setSales(saleData); setLowStock(stockData); setTopProducts(topData); }); }, []);
  return <section><h1 className="font-display text-3xl font-bold">Relatorios</h1><div className="mt-5 grid gap-4 xl:grid-cols-2"><ReportTable title="Vendas do dia" rows={sales.map((sale) => [sale.id.slice(-6), new Date(sale.createdAt).toLocaleString('pt-BR'), sale.operator?.name ?? '-', money(sale.grossTotalCents), money(sale.discountTotalCents), money(sale.netTotalCents), sale.status])} headers={['Venda', 'Data', 'Operador', 'Bruto', 'Desc.', 'Total', 'Status']} /><ReportTable title="Estoque baixo" rows={lowStock.map((product) => [product.name, product.barcode, String(product.stockQuantity), String(product.minStock), product.category?.name ?? '-'])} headers={['Produto', 'Codigo', 'Atual', 'Minimo', 'Categoria']} /><ReportTable title="Produtos mais vendidos" rows={topProducts.map((item) => [item.product?.name ?? '-', String(item.quantity ?? 0), money(item.totalCents)])} headers={['Produto', 'Qtd', 'Total']} /></div></section>;
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number)[][] }) {
  return <div className="panel overflow-auto"><h2 className="p-4 font-display text-xl font-bold">{title}</h2><table className="w-full min-w-[520px]"><thead className="bg-paper"><tr>{headers.map((header) => <th key={header} className="table-cell">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-line">{row.map((cell, cellIndex) => <td key={cellIndex} className="table-cell">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function UsersPage({ notify }: { notify: (notice: Notice) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: 'Caixa@123', role: 'CASHIER' as User['role'] });
  async function load() { setUsers(await api<User[]>('/users')); }
  useEffect(() => { load().catch((error) => notify({ type: 'error', text: error.message })); }, []);
  async function create(event: React.FormEvent) { event.preventDefault(); await api('/users', { method: 'POST', body: JSON.stringify(form) }); notify({ type: 'ok', text: 'Usuario criado.' }); setForm({ name: '', email: '', password: 'Caixa@123', role: 'CASHIER' }); await load(); }
  return <section><h1 className="font-display text-3xl font-bold">Usuarios</h1><form onSubmit={create} className="panel mt-5 grid gap-3 p-4 md:grid-cols-4"><input className="field" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="field" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input className="field" placeholder="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}><option value="CASHIER">Operador</option><option value="ADMIN">Admin</option></select><button className="btn-primary md:col-span-4">Criar usuario</button></form><div className="panel mt-5 overflow-auto"><table className="w-full"><tbody>{users.map((row) => <tr className="border-b border-line" key={row.id}><td className="table-cell font-semibold">{row.name}</td><td className="table-cell">{row.email}</td><td className="table-cell">{row.role}</td><td className="table-cell">{row.active ? 'Ativo' : 'Inativo'}</td></tr>)}</tbody></table></div></section>;
}
