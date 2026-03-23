import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();

  const stocks = [
    { symbol: 'TCS', name: 'Tata Consultancy', price: 3456.75, change: '+1.2%', positive: true },
    { symbol: 'INFY', name: 'Infosys', price: 1678.40, change: '-0.5%', positive: false },
    { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2890.30, change: '+2.1%', positive: true },
    { symbol: 'HDFC', name: 'HDFC Bank', price: 1567.90, change: '+0.8%', positive: true },
    { symbol: 'WIPRO', name: 'Wipro', price: 456.20, change: '-1.3%', positive: false },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>StockSphere</Text>
      <Text style={styles.subtitle}>Market Overview</Text>

      {/* Quick Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/watchlist')}>
          <Text style={styles.actionText}>Watchlist</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/portfolio')}>
          <Text style={styles.actionText}>Portfolio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/chatbot')}>
          <Text style={styles.actionText}>AI Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Stock List */}
      <Text style={styles.sectionTitle}>Top Stocks</Text>
      {stocks.map((stock, index) => (
        <View key={index} style={styles.stockCard}>
          <View style={styles.stockLeft}>
            <Text style={styles.symbol}>{stock.symbol}</Text>
            <Text style={styles.name}>{stock.name}</Text>
          </View>
          <View style={styles.stockRight}>
            <Text style={styles.price}>₹{stock.price}</Text>
            <Text style={[styles.change, { color: stock.positive ? '#27ae60' : '#e74c3c' }]}>
              {stock.change}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 10, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 15 },
  stockCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  stockLeft: { flex: 1 },
  stockRight: { alignItems: 'flex-end' },
  symbol: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  name: { fontSize: 12, color: '#666' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  change: { fontSize: 14, fontWeight: 'bold' },
});