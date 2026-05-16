'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, X, Upload, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const EMPTY = { name_uz: '', name_ru: '', name_en: '', price: '', discount_price: '', weight: '', menu_category_id: '', images: [] as string[], is_active: true, is_available: true }

export function RestaurantMenuClient({ restaurant, categories, products, accessToken }: { restaurant: any; categories: any[]; products: any[]; accessToken: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selectedCat, setSelectedCat] = useState('all')
  const [newCatName, setNewCatName] = useState('')
  const [productForm, setProductForm] = useState<any>(null)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  const filtered = selectedCat === 'all' ? products : products.filter(p => (p.menu_category_id?._id || p.menu_category_id) === selectedCat)

  const addCategory = async () => {
    if (!newCatName.trim()) return
    const res = await fetch(`${API_URL}/api/v1/menu-categories/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ restaurant_id: restaurant._id, name_uz: newCatName, name_ru: newCatName, name_en: newCatName }),
    })
    if (res.ok) { toast.success("Qo'shildi"); setNewCatName(''); startTransition(() => router.refresh()) }
    else toast.error('Xatolik')
  }

  const deleteCategory = async (id: string) => {
    const res = await fetch(`${API_URL}/api/v1/menu-categories/menu/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) { toast.success("O'chirildi"); startTransition(() => router.refresh()) } else toast.error('Xatolik')
  }

  const openCreate = () => { setEditProduct(null); setProductForm({ ...EMPTY, menu_category_id: selectedCat !== 'all' ? selectedCat : '' }) }
  const openEdit = (p: any) => {
    setEditProduct(p)
    setProductForm({ name_uz: p.name_uz, name_ru: p.name_ru, name_en: p.name_en, price: String(p.price), discount_price: String(p.discount_price || ''), weight: p.weight || '', menu_category_id: p.menu_category_id?._id || p.menu_category_id || '', images: p.images || [], is_active: p.is_active, is_available: p.is_available })
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch(`${API_URL}/api/v1/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: fd })
    setUploading(false)
    if (res.ok) {
      const json = await res.json()
      const url = `${API_URL}${json.data?.url || json.url}`
      setProductForm((f: any) => ({ ...f, images: [...f.images, url] }))
    } else toast.error('Rasm yuklanmadi')
  }

  const saveProduct = async () => {
    if (!productForm?.name_uz || !productForm?.price || !productForm?.menu_category_id)
      return toast.error('Nom, narx va kategoriya majburiy')
    const slug = (productForm.name_uz as string).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `product-${Date.now()}`
    const body = { ...productForm, restaurant_id: restaurant._id, slug, price: +productForm.price, discount_price: productForm.discount_price ? +productForm.discount_price : undefined }
    const url = editProduct ? `${API_URL}/api/v1/products/${editProduct._id}` : `${API_URL}/api/v1/products`
    const res = await fetch(url, { method: editProduct ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) })
    if (res.ok) {
      toast.success(editProduct ? 'Saqlandi' : "Qo'shildi"); setProductForm(null); setEditProduct(null)
      startTransition(() => router.refresh())
    } else { const j = await res.json().catch(() => ({})); toast.error(j.error ?? j.message ?? 'Xatolik') }
  }

  const deleteProduct = async (id: string) => {
    const res = await fetch(`${API_URL}/api/v1/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) { toast.success("O'chirildi"); startTransition(() => router.refresh()) } else toast.error('Xatolik')
  }

  const toggleProduct = async (p: any) => {
    await fetch(`${API_URL}/api/v1/products/${p._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ is_active: !p.is_active }) })
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menyu</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Mahsulot qo'shish</Button>
      </div>

      {/* Categories */}
      <Card><CardContent className="pt-4">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedCat === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}>
            Hammasi ({products.length})
          </button>
          {categories.map(cat => (
            <div key={cat._id} className="flex items-center gap-1">
              <button onClick={() => setSelectedCat(cat._id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedCat === cat._id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted'}`}>
                {cat.name_uz} ({products.filter(p => (p.menu_category_id?._id || p.menu_category_id) === cat._id).length})
              </button>
              <button onClick={() => deleteCategory(cat._id)} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} placeholder="Yangi kategoriya..." className="h-8 w-36 text-sm" />
            <button onClick={addCategory} disabled={!newCatName.trim()} className="text-primary hover:text-primary/80 disabled:opacity-40"><FolderPlus className="h-4 w-4" /></button>
          </div>
        </div>
      </CardContent></Card>

      {/* Products table */}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rasm</TableHead>
              <TableHead>Nomi</TableHead>
              <TableHead>Kategoriya</TableHead>
              <TableHead className="text-right">Narx</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Amal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Mahsulotlar topilmadi</TableCell></TableRow>
            )}
            {filtered.map((p: any) => {
              const cat = categories.find(c => c._id === (p.menu_category_id?._id || p.menu_category_id))
              return (
                <TableRow key={p._id}>
                  <TableCell>{p.images?.[0] ? <img src={p.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-muted" />}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name_uz}</div>
                    {p.weight && <div className="text-xs text-muted-foreground">{p.weight}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cat?.name_uz || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{p.price?.toLocaleString()} so'm</div>
                    {p.discount_price ? <div className="text-xs text-green-600">{p.discount_price?.toLocaleString()} so'm</div> : null}
                  </TableCell>
                  <TableCell className="text-center">
                    <button onClick={() => toggleProduct(p)}>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Faol' : 'Nofaol'}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon-sm" variant="destructive" onClick={() => deleteProduct(p._id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Product Dialog */}
      <Dialog open={productForm !== null} onOpenChange={open => { if (!open) { setProductForm(null); setEditProduct(null) } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</DialogTitle>
          </DialogHeader>
          {productForm && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Kategoriya *</label>
                <select value={productForm.menu_category_id} onChange={e => setProductForm({ ...productForm, menu_category_id: e.target.value })}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none">
                  <option value="">Tanlang...</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name_uz}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['uz', 'ru', 'en'] as const).map(lang => (
                  <div key={lang}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nomi ({lang.toUpperCase()}) *</label>
                    <Input value={productForm[`name_${lang}`]} onChange={e => setProductForm({ ...productForm, [`name_${lang}`]: e.target.value })} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Narx *</label><Input type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Aksiya narxi</label><Input type="number" value={productForm.discount_price} onChange={e => setProductForm({ ...productForm, discount_price: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Og'irlik</label><Input placeholder="500g" value={productForm.weight} onChange={e => setProductForm({ ...productForm, weight: e.target.value })} /></div>
              </div>
              <div className="flex gap-4">
                {[{ key: 'is_active', label: 'Faol' }, { key: 'is_available', label: 'Mavjud' }].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={productForm[key]} onChange={e => setProductForm({ ...productForm, [key]: e.target.checked })} className="h-4 w-4 rounded" />
                    {label}
                  </label>
                ))}
              </div>
              {/* Images */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Rasmlar</label>
                <div className="flex flex-wrap gap-2">
                  {(productForm.images as string[]).map((url: string, i: number) => (
                    <div key={i} className="relative h-20 w-20">
                      <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
                      <button onClick={() => setProductForm((f: any) => ({ ...f, images: f.images.filter((_: string, j: number) => j !== i) }))}
                        className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                  <label className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted">
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setProductForm(null); setEditProduct(null) }}>Bekor</Button>
                <Button onClick={saveProduct}>{editProduct ? 'Saqlash' : "Qo'shish"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
