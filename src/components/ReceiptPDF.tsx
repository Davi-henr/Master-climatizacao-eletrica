'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 40 },
  header: { marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#ea580c', paddingBottom: 10 },
  title: { fontSize: 24, color: '#1e293b', fontWeight: 'bold' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
  body: { fontSize: 12, color: '#334155', lineHeight: 1.6, marginTop: 20 },
  valueBox: {
    marginTop: 30,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  valueText: { fontSize: 20, color: '#ea580c', fontWeight: 'bold' },
  signatureArea: { marginTop: 80, alignItems: 'center' },
  signatureLine: { width: 250, borderTopWidth: 1, borderTopColor: '#94a3b8', marginBottom: 10 },
  signatureText: { fontSize: 12, color: '#64748b' }
});

export const ReceiptPDF = ({ funcionario, totalDias, valorTotal, data }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Master Climatização e Elétrica</Text>
        <Text style={styles.subtitle}>Recibo de Pagamento - Diárias Técnicas</Text>
      </View>

      <View>
        <Text style={styles.body}>
          Recebi de Master Climatização e Elétrica, a importância de R$ {valorTotal.toFixed(2)}, referente ao pagamento de {totalDias} diárias trabalhadas até a data de {data}.
        </Text>
        <Text style={styles.body}>
          Profissional: {funcionario.nome} {'\n'}
          Cargo: {funcionario.cargo}
        </Text>
      </View>

      <View style={styles.valueBox}>
        <Text style={styles.valueText}>Valor Recebido: R$ {valorTotal.toFixed(2)}</Text>
      </View>

      <View style={styles.signatureArea}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureText}>Assinatura do Profissional</Text>
        <Text style={{...styles.signatureText, marginTop: 5}}>{funcionario.nome}</Text>
      </View>
    </Page>
  </Document>
);
