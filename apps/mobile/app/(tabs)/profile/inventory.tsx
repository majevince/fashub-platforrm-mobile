import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Search, Plus, X, MessageCircle, Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuth } from '../../../context/AuthContext';
import {
  getGlobalFabrics,
  getMyFabrics,
  createFabric,
  updateFabric,
  deleteFabric,
  uploadFiles,
  findOrCreateConversation,
  resolveMediaUrl,
  ApiError,
} from '@fashub/api-client';
import type { FabricInventoryItem } from '@fashub/types';
import { toUploadableFile } from '../../../lib/uploadableFile';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { Banner } from '../../../components/Banner';
import { LoadingState } from '../../../components/LoadingState';
import { EmptyState } from '../../../components/EmptyState';

type Mode = 'mine' | 'global';

function stockStatus(item: FabricInventoryItem): { label: string; color: string } {
  if (!item.inStock || item.available === 0) return { label: 'Out of stock', color: '#B42318' };
  if (item.reorderLevel != null && item.available <= item.reorderLevel) return { label: 'Low stock', color: '#B45309' };
  return { label: 'In stock', color: '#15803D' };
}

/**
 * Web's Inventory (app/inventory/page.tsx) is a cross-tenant catalog — every
 * designer/tailor's fabrics grouped by owner, not a private stock screen —
 * ported here as a Mine/Global toggle covering the same GET /api/fabric-
 * inventory (own) and /global (everyone) endpoints. Deliberately
 * simplified vs. web's 990-line detail panel: color variants are a single
 * name+hex+one-photo entry each here, not web's nested per-variant
 * multi-photo array with drag-and-drop reordering — that specific
 * interaction needs real mobile-native design work, not a rushed port, and
 * is flagged rather than half-built. Stock adjustment is a direct quantity
 * edit through the real PATCH endpoint, not web's fragile "movement log
 * parsed out of a notes string" pattern.
 */
export default function InventoryScreen() {
  const { colors, typeScale, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('global');
  const [fabrics, setFabrics] = useState<FabricInventoryItem[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [detailItem, setDetailItem] = useState<FabricInventoryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FabricInventoryItem | null>(null);

  const isProfessional = user?.role === 'designer' || user?.role === 'tailor';

  const load = useCallback(() => {
    if (!user) return;
    setError('');
    const req = mode === 'mine' ? getMyFabrics(user.id, { q: query.trim() || undefined }) : getGlobalFabrics({ q: query.trim() || undefined });
    req.then((res) => setFabrics(res.fabrics)).catch(() => setError("Couldn't load inventory."));
  }, [user, mode, query]);

  useEffect(() => {
    setFabrics(null);
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const grouped = useMemo(() => {
    if (mode !== 'global' || !fabrics) return null;
    const sections = new Map<string, { owner: FabricInventoryItem['ownerInfo']; items: FabricInventoryItem[] }>();
    for (const f of fabrics) {
      const key = f.ownerInfo?.userId ?? 'unknown';
      if (!sections.has(key)) sections.set(key, { owner: f.ownerInfo, items: [] });
      sections.get(key)!.items.push(f);
    }
    const entries = Array.from(sections.values());
    entries.sort((a, b) => (a.owner?.userId === user?.id ? -1 : b.owner?.userId === user?.id ? 1 : (a.owner?.name ?? '').localeCompare(b.owner?.name ?? '')));
    return entries;
  }, [fabrics, mode, user?.id]);

  const handleMessageOwner = async (ownerId: string) => {
    if (!user) return;
    try {
      const { conversation } = await findOrCreateConversation(user.id, ownerId);
      setDetailItem(null);
      router.push(`/messages/${conversation.id}`);
    } catch {
      Alert.alert("Couldn't open conversation", 'Please try again.');
    }
  };

  const handleDelete = async (item: FabricInventoryItem) => {
    if (!user) return;
    Alert.alert('Delete fabric', `Remove "${item.name}" from your inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFabric(item.id, user.id);
            setDetailItem(null);
            load();
          } catch {
            Alert.alert("Couldn't delete", 'Please try again.');
          }
        },
      },
    ]);
  };

  const renderCard = (item: FabricInventoryItem) => {
    const stock = stockStatus(item);
    const cover = item.colorVariants[0]?.photos?.[0] ?? item.images[0];
    const isOwner = item.ownerInfo?.userId === user?.id;
    return (
      <Pressable key={item.id} onPress={() => setDetailItem(item)} style={{ flex: 1, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
        <View style={{ height: 100, backgroundColor: item.colorVariants[0]?.hex ?? colors.ivoryDeep }}>
          {cover ? <Image source={{ uri: resolveMediaUrl(cover) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: `${stock.color}22`, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontWeight: '600', fontSize: 8.5, color: stock.color }}>{stock.label}</Text>
          </View>
        </View>
        <View style={{ padding: 9, gap: 3 }}>
          <Text style={{ fontWeight: '600', fontSize: 11.5, color: colors.ink }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontWeight: '600', fontSize: 10, color: colors.gold }}>
            {item.sellingPricePerUnit ? `$${item.sellingPricePerUnit.toFixed(2)}` : '—'} <Text style={{ color: colors.inkSoft }}>/{item.unit}</Text>
          </Text>
          <Text style={{ fontWeight: '400', fontSize: 9.5, color: colors.inkSoft }}>{item.available} {item.unit} avail.</Text>
          {mode === 'global' && !isOwner && item.ownerInfo ? (
            <Text style={{ fontWeight: '400', fontSize: 9, color: colors.inkSoft }} numberOfLines={1}>
              {item.ownerInfo.name}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ ...typeScale.h1, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>Inventory</Text>
        </View>
        {isProfessional ? (
          <Pressable
            onPress={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={17} color={colors.ivory} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        {(['global', 'mine'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: mode === m ? colors.ink : 'transparent', borderWidth: 1, borderColor: mode === m ? colors.ink : colors.line }}
          >
            <Text style={{ fontWeight: '600', fontSize: 12, color: mode === m ? colors.ivory : colors.inkSoft }}>{m === 'global' ? 'Global' : 'My Fabrics'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
        <Search size={15} color={colors.inkSoft} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search fabrics…" placeholderTextColor={colors.inkSoft} style={{ flex: 1, fontWeight: '400', fontSize: 13, color: colors.ink, padding: 0 }} />
      </View>

      {error ? (
        <Banner tone="error">{error}</Banner>
      ) : fabrics === null ? (
        <LoadingState />
      ) : fabrics.length === 0 ? (
        <EmptyState title="No fabrics found" message={mode === 'mine' ? "You haven't added any fabrics yet." : 'Try a different search.'} />
      ) : mode === 'global' && grouped ? (
        <FlatList
          key="grouped"
          data={grouped}
          keyExtractor={(g) => g.owner?.userId ?? Math.random().toString()}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
          renderItem={({ item: section }) => (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '600', fontSize: 12.5, color: colors.ink }}>
                {section.owner?.userId === user?.id ? 'Your fabrics' : section.owner?.name ?? 'Unknown'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{section.items.map((f) => <View key={f.id} style={{ width: '47%' }}>{renderCard(f)}</View>)}</View>
            </View>
          )}
        />
      ) : (
        <FlatList
          key="grid"
          data={fabrics}
          keyExtractor={(f) => f.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ gap: 10, paddingBottom: spacing.xl }}
          renderItem={({ item }) => renderCard(item)}
        />
      )}

      <FabricDetailModal
        item={detailItem}
        currentUserId={user?.id}
        onClose={() => setDetailItem(null)}
        onEdit={(item) => {
          setDetailItem(null);
          setEditingItem(item);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
        onMessageOwner={handleMessageOwner}
      />

      <FabricFormModal
        visible={formOpen}
        item={editingItem}
        userId={user?.id}
        role={user?.role === 'tailor' ? 'tailor' : 'designer'}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function FabricDetailModal({
  item,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  onMessageOwner,
}: {
  item: FabricInventoryItem | null;
  currentUserId?: string;
  onClose: () => void;
  onEdit: (item: FabricInventoryItem) => void;
  onDelete: (item: FabricInventoryItem) => void;
  onMessageOwner: (ownerId: string) => void;
}) {
  const { colors, typeScale, spacing, radius } = useTheme();
  if (!item) return null;
  const isOwner = item.ownerInfo?.userId === currentUserId;
  const cover = item.colorVariants[0]?.photos?.[0] ?? item.images[0];
  const stock = stockStatus(item);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,16,0.4)' }}>
        <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: 10 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.md }}>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.inkSoft} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}>
            <View style={{ height: 180, borderRadius: radius.md, backgroundColor: item.colorVariants[0]?.hex ?? colors.ivoryDeep, overflow: 'hidden' }}>
              {cover ? <Image source={{ uri: resolveMediaUrl(cover) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
            </View>
            <View>
              <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{item.name}</Text>
              {item.rollNumber ? <Text style={{ fontWeight: '500', fontSize: 10.5, color: colors.inkSoft }}>SKU {item.rollNumber}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontWeight: '700', fontSize: 18, color: colors.ink }}>
                {item.sellingPricePerUnit ? `$${item.sellingPricePerUnit.toFixed(2)}` : '—'} <Text style={{ fontWeight: '400', fontSize: 12, color: colors.inkSoft }}>/{item.unit}</Text>
              </Text>
              <View style={{ backgroundColor: `${stock.color}22`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontWeight: '600', fontSize: 10, color: stock.color }}>{stock.label}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                ['Type', item.fabricType],
                ['Composition', item.composition],
                ['Weight', item.weight],
                ['Pattern', item.pattern],
                ['Available', `${item.available} ${item.unit}`],
                ['Reserved', `${item.reserved} ${item.unit}`],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <View key={label} style={{ backgroundColor: colors.paper, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minWidth: '30%' }}>
                    <Text style={{ fontWeight: '500', fontSize: 8.5, color: colors.inkSoft, textTransform: 'uppercase' }}>{label}</Text>
                    <Text style={{ fontWeight: '600', fontSize: 11.5, color: colors.ink, marginTop: 2 }}>{value}</Text>
                  </View>
                ))}
            </View>

            {item.colorVariants.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {item.colorVariants.map((v, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: v.hex ?? '#ccc' }} />
                    <Text style={{ fontWeight: '400', fontSize: 10.5, color: colors.ink }}>{v.label ?? v.hex}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {item.description ? <Text style={{ ...typeScale.body, fontFamily: undefined, fontWeight: '400', color: colors.inkSoft }}>{item.description}</Text> : null}

            {item.ownerInfo ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.inkSoft, overflow: 'hidden' }}>
                  {item.ownerInfo.avatar ? <Image source={{ uri: resolveMediaUrl(item.ownerInfo.avatar) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                </View>
                <Text style={{ fontWeight: '400', fontSize: 12, color: colors.inkSoft }}>{isOwner ? 'Shared by you' : `Shared by ${item.ownerInfo.name}`}</Text>
              </View>
            ) : null}

            {isOwner ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button variant="secondary" onPress={() => onEdit(item)}>
                    Edit
                  </Button>
                </View>
                <Pressable onPress={() => onDelete(item)} style={{ width: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.ivoryDeep }}>
                  <Trash2 size={17} color={colors.oxblood} />
                </Pressable>
              </View>
            ) : item.ownerInfo ? (
              <Button variant="primary" onPress={() => onMessageOwner(item.ownerInfo!.userId)}>
                {`Message ${item.ownerInfo.name}`}
              </Button>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FabricFormModal({
  visible,
  item,
  userId,
  role,
  onClose,
  onSaved,
}: {
  visible: boolean;
  item: FabricInventoryItem | null;
  userId?: string;
  role: 'designer' | 'tailor';
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors, typeScale, spacing, radius } = useTheme();
  const [name, setName] = useState('');
  const [fabricType, setFabricType] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('yards');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(item?.name ?? '');
    setFabricType(item?.fabricType ?? '');
    setDescription(item?.description ?? '');
    setColor(item?.color ?? '');
    setQuantity(item ? String(item.quantity) : '');
    setUnit(item?.unit ?? 'yards');
    setCostPerUnit(item ? String(item.costPerUnit) : '');
    setSellingPrice(item?.sellingPricePerUnit ? String(item.sellingPricePerUnit) : '');
    setSupplier(item?.supplier ?? '');
    setPhotoUri(null);
    setError('');
  }, [visible, item]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!userId || !name.trim() || !fabricType.trim()) {
      setError('Name and fabric type are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let images: string[] | undefined;
      if (photoUri) {
        const uploaded = await uploadFiles([toUploadableFile(photoUri)], 'fabric-swatches');
        images = uploaded.urls;
      }
      const fields = {
        name: name.trim(),
        fabricType: fabricType.trim(),
        description: description.trim() || undefined,
        color: color.trim(),
        quantity: quantity ? Number(quantity) : 0,
        unit,
        costPerUnit: costPerUnit ? Number(costPerUnit) : 0,
        sellingPricePerUnit: sellingPrice ? Number(sellingPrice) : undefined,
        supplier: supplier.trim() || undefined,
        ...(images ? { images, colorVariants: color.trim() ? [{ label: color.trim(), photos: images }] : undefined } : {}),
      };
      if (item) {
        await updateFabric(item.id, { userId, ...fields });
      } else {
        await createFabric({ userId, role, inStock: true, ...fields });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save fabric.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.ink} />
          </Pressable>
          <Text style={{ ...typeScale.h2, fontFamily: undefined, fontWeight: '700', color: colors.ink }}>{item ? 'Edit fabric' : 'Add fabric'}</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          {error ? <Banner tone="error">{error}</Banner> : null}

          <Pressable onPress={pickPhoto} style={{ height: 120, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={{ fontWeight: '400', fontSize: 12.5, color: colors.inkSoft }}>Tap to add a photo</Text>
            )}
          </Pressable>

          <TextField label="Name" value={name} onChangeText={setName} placeholder="Abuja Greek Cotton" />
          <TextField label="Fabric type" value={fabricType} onChangeText={setFabricType} placeholder="Cotton, Silk, Denim…" />
          <TextField label="Color" value={color} onChangeText={setColor} placeholder="Ivory" />
          <TextField label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Unit" value={unit} onChangeText={setUnit} placeholder="yards" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="Cost / unit" value={costPerUnit} onChangeText={setCostPerUnit} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Selling price / unit" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" />
            </View>
          </View>
          <TextField label="Supplier (optional)" value={supplier} onChangeText={setSupplier} />

          <Button variant="primary" onPress={handleSave} disabled={saving}>
            {saving ? 'Saving…' : item ? 'Save changes' : 'Add to inventory'}
          </Button>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
