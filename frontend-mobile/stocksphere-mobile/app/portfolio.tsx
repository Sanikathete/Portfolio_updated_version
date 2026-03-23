import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';

const API_URL = 'http://135.235.193.71:8001';

export default function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState([
    { symbol: 'AAPL', name: 'Apple Inc', shares: 10, price: 178.5, value: 1785 },
    { symbol: 'TSLA', name: 'Tesla Inc', shares: 5, price: 245.3, value: 1226.5 },
    { symbol: 'GOOGL', name: 'Alphabet Inc', shares: 8, price: 141.8, value: 1134.4 },
  ]);

  const totalValue = portfolio.reduce((sum, stock) => sum + stock.value, 0);

  const handleDownloadPDF = async () => {
    try {
      Alert.alert('Download', 'Go to browser: http://135.235.193.71:8001/reports/watchlist/pdf');
    } catch (error) {
      Alert.alert('Error', 'Could not download PDF.');
    }
  };

  const handleDownloadCSV = async () => {
    try {
      Alert.alert('Download', 'Go to browser: http://135.235.193.71:8001/reports/watchlist/csv');
    } catch (error) {
      Alert.alert('Error', 'Could not download CSV.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Portfolio</Text>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Value</Text>
        <Text style={styles.totalValue}>${totalValue.toFixed(2)}</Text>
      </View>
      {portfolio.map((stock, index) => (
        <View key={index} style={styles.stockCard}>
          <View style={styles.stockLeft}>
            <Text style={styles.symbol}>{stock.symbol}</Text>
            <Text style={styles.name}>{stock.name}</Text>
          </View>
          <View style={styles.stockRight}>
            <Text style={styles.value}>${stock.value.toFixed(2)}</Text>
            <Text style={styles.shares}>{stock.shares} shares @ ${stock.price}</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.button} onPress={handleDownloadPDF}>
        <Text style={styles.buttonText}>Download PDF Report</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.csvButton]} onPress={handleDownloadCSV}>
        <Text style={styles.buttonText}>Download CSV Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 20 },
  totalCard: { backgroundColor: '#1a1a2e', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' },
  totalLabel: { color: '#fff', fontSize: 14, opacity: 0.8 },
  totalValue: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  stockCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  stockLeft: { flex: 1 },
  stockRight: { alignItems: 'flex-end' },
  symbol: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  name: { fontSize: 12, color: '#666' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#27ae60' },
  shares: { fontSize: 12, color: '#666' },
  button: { backgroundColor: '#1a1a2e', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  csvButton: { backgroundColor: '#27ae60' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});