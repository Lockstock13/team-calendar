"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Camera, PackageSearch, Activity, Server, AlertTriangle } from "lucide-react";
import { useGlobalContext } from "@/app/providers";
import { useToast } from "@/app/components/ToastProvider";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { supabase } from "@/lib/supabase";

const EQUIPMENT_CATEGORIES = ["Kamera", "Lensa", "Lighting", "Drone", "Audio", "Lainnya"];
const EQUIPMENT_STATUS = ["Tersedia", "Dipinjam", "Maintenance", "Rusak"];

export default function EquipmentPage() {
    const [equipmentList, setEquipmentList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ name: "", serial_number: "", category: "Kamera", status: "Tersedia", notes: "" });

    const { user } = useGlobalContext();
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchEquipment();
    }, []);

    const fetchEquipment = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("equipment")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setEquipmentList(data || []);
        } catch (err) {
            addToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, serial_number: item.serial_number || "", category: item.category, status: item.status, notes: item.notes || "" });
        } else {
            setEditingItem(null);
            setFormData({ name: "", serial_number: "", category: "Kamera", status: "Tersedia", notes: "" });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                // Edit flow
                const { error } = await supabase
                    .from("equipment")
                    .update(formData)
                    .eq("id", editingItem.id);

                if (error) throw error;
                addToast("Equipment diperbarui", "success");
            } else {
                // Create flow
                const { error } = await supabase
                    .from("equipment")
                    .insert([formData]);

                if (error) throw error;
                addToast("Equipment ditambahkan", "success");
            }
            setShowModal(false);
            fetchEquipment();
        } catch (err) {
            addToast(err.message, "error");
        }
    };

    const handleDelete = async (id, name) => {
        const isConfirmed = await confirm({
            title: "Hapus Equipment",
            message: `Yakin ingin menghapus ${name}?`,
            confirmText: "Hapus",
            cancelText: "Batal"
        });
        if (!isConfirmed) return;

        try {
            const { error } = await supabase
                .from("equipment")
                .delete()
                .eq("id", id);

            if (error) throw error;
            addToast("Equipment dihapus", "success");
            fetchEquipment();
        } catch (err) {
            addToast(err.message, "error");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Tersedia": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
            case "Dipinjam": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
            case "Maintenance": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
            case "Rusak": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Camera className="w-6 h-6 text-primary" />
                        Equipment Studio
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Kelola data alat, kamera, dan lensa studio.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Alat
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-muted-foreground">
                    <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
                    Memuat data equipment...
                </div>
            ) : equipmentList.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/10">
                    <PackageSearch className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium">Belum Ada Equipment</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        Tambahkan daftar inventaris alat studio Anda ke database. Data ini akan bisa dipilih setiap membuat jadwal penugasan.
                    </p>
                    <button onClick={() => handleOpenModal()} className="font-semibold text-primary hover:underline">
                        + Tambah Alat Pertama
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipmentList.map((item) => (
                        <div key={item.id} className="group bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="font-semibold text-lg truncate" title={item.name}>{item.name}</h3>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        {item.serial_number && (
                                            <span className="text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded cursor-copy" title="Serial Number">
                                                SN: {item.serial_number}
                                            </span>
                                        )}
                                        <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                            {item.category}
                                        </span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(item)} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {item.notes && (
                                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 opacity-60" />
                                    {item.notes}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background rounded-2xl w-full max-w-md shadow-xl border">
                        <div className="px-5 py-4 border-b">
                            <h3 className="font-bold text-lg">{editingItem ? "Edit Equipment" : "Tambah Equipment"}</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Nama Alat</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Misal: Sony A7 IV"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Serial Number</label>
                                    <input
                                        type="text"
                                        value={formData.serial_number}
                                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl bg-background text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="SN atau Kode Unik"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Kategori</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    >
                                        {EQUIPMENT_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    >
                                        {EQUIPMENT_STATUS.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Catatan (Optional)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none h-20"
                                    placeholder="Kondisi, Serial Number, dll..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 hover:bg-muted font-medium text-sm rounded-xl transition-colors">
                                    Batal
                                </button>
                                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                                    {editingItem ? "Update" : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
