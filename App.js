import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Image, Alert, Linking, StatusBar, Modal, ActivityIndicator, Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@wishlist_data';

export default function App() {
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. ГЛАВНАЯ ФУНКЦИЯ ДЕНЕГ (Генератор ссылок) ---
  // Сюда ты потом вставишь реальные данные из кабинета Admitad/ePN
  const convertToAffiliate = (originalUrl) => {
    // Словарь: Домен -> Твой партнерский префикс
    const PARTNERS = {
      'ozon.ru': 'https://www.ozon.ru/referral/?code=YOUR_REAL_CODE&url=', 
      'wildberries.ru': 'https://ad.admitad.com/g/YOUR_ID/?ulp=',
      'aliexpress.com': 'https://s.click.aliexpress.com/deep_link/YOUR_ID?url=',
      'market.yandex.ru': 'https://ya.cc/YOUR_ID?url='
    };

    let finalUrl = originalUrl;

    // Проверяем, подходит ли ссылка под партнерку
    for (const [domain, prefix] of Object.entries(PARTNERS)) {
      if (originalUrl.includes(domain)) {
        // Кодируем ссылку, чтобы она корректно встала в хвост
        // encodeURIComponent превращает слэши / в %2F, это важно для ссылок
        finalUrl = `${prefix}${encodeURIComponent(originalUrl)}`;
        break; 
      }
    }
    return finalUrl;
  };

  // --- 2. ФУНКЦИЯ "ПОДЕЛИТЬСЯ" (Social Share) ---
  const handleShare = async () => {
    if (items.length === 0) {
      Alert.alert('Пусто', 'Сначала добавь желания!');
      return;
    }

    // Собираем красивый текст для Telegram/WhatsApp
    let message = "🎉 Мой Вишлист (что подарить мне на ДР):\n\n";
    
    items.forEach((item, index) => {
      // Генерируем ссылку, которая принесет тебе деньги
      const moneyLink = convertToAffiliate(item.url);
      
      message += `${index + 1}. ${item.title}\n`;
      message += `💰 ${item.price}\n`;
      message += `👉 Ссылка: ${moneyLink}\n\n`;
    });

    message += "Сгенерировано в приложении WishList";

    try {
      // Вызываем стандартную шторку Android
      await Share.share({
        message: message,
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  // --- ЗАГРУЗКА ---
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) setItems(JSON.parse(jsonValue));
      else setItems([]); // Пустой список по умолчанию
    } catch(e) { Alert.alert('Ошибка загрузки'); } 
    finally { setIsLoading(false); }
  };

  const saveData = async (newItems) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {}
  };

  const handleBuy = async (itemUrl) => {
    const affiliateUrl = convertToAffiliate(itemUrl);
    const supported = await Linking.canOpenURL(affiliateUrl);
    if (supported) await Linking.openURL(affiliateUrl);
    else Alert.alert("Ошибка открытия");
  };

  const handleAddItem = () => {
    if (!inputUrl) return;
    const newItem = {
      id: Date.now(),
      title: 'Желание #' + (items.length + 1),
      price: 'Цена не указана',
      image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=500',
      url: inputUrl,
      reserved: false
    };
    const updated = [newItem, ...items];
    setItems(updated);
    saveData(updated);
    setInputUrl('');
    setModalVisible(false);
  };

  const handleDelete = (id) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveData(updated);
  };

  if (isLoading) return <ActivityIndicator size="large" style={styles.center} color="#e11d48"/>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />
      
      {/* ШАПКА С КНОПКОЙ SHARE */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Wish<Text style={{color:'#e11d48'}}>List</Text></Text>
          <Text style={styles.count}>{items.length} желаний</Text>
        </View>
        
        {/* КНОПКА ПОДЕЛИТЬСЯ */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>📤 Отправить</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardPrice}>{item.price}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => handleBuy(item.url)}>
                  <Text style={styles.btnText}>Открыть</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(item.id)}>
                  <Text style={styles.btnDeleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Список пуст. Нажми + чтобы добавить!</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Добавить ссылку</Text>
            <TextInput style={styles.input} placeholder="Вставь ссылку..." value={inputUrl} onChangeText={setInputUrl} />
            <TouchableOpacity style={styles.btnAdd} onPress={handleAddItem}>
              <Text style={styles.btnText}>Сохранить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
              <Text style={styles.btnCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  count: { fontSize: 12, color: '#64748b' },
  shareBtn: { backgroundColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  shareBtnText: { fontWeight: 'bold', color: '#0f172a', fontSize: 12 },
  list: { padding: 15, paddingBottom: 100 },
  card: { backgroundColor: 'white', borderRadius: 16, marginBottom: 15, overflow: 'hidden', flexDirection: 'row', height: 130, elevation: 2 },
  cardImage: { width: 100, height: '100%', backgroundColor: '#eee' },
  cardContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  cardPrice: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  cardActions: { flexDirection: 'row', gap: 10 },
  btnPrimary: { backgroundColor: '#e11d48', flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 5 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  btnDelete: { width: 30, height: 30, backgroundColor: '#f1f5f9', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  btnDeleteText: { color: '#94a3b8' },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: 'white', fontSize: 30, marginTop: -3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 15, marginBottom: 15 },
  btnAdd: { backgroundColor: '#e11d48', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  btnCancel: { padding: 10, alignItems: 'center' },
  btnCancelText: { color: '#64748b' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', textAlign: 'center' }
});