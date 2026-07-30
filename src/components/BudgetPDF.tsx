'use client';

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 30 },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ea580c', paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { flex: 1 },
  title: { fontSize: 24, color: '#1e293b', fontWeight: 'bold' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
  logo: { width: 100, height: 40, objectFit: 'contain' },
  section: { marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 10, color: '#64748b' },
  value: { fontSize: 12, color: '#1e293b', fontWeight: 'bold' },
  
  blockGroup: { marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 8 },
  blockHeader: { backgroundColor: '#f8fafc', padding: 6, marginBottom: 5, borderRadius: 2 },
  blockTitle: { fontSize: 11, fontWeight: 'bold', color: '#ea580c' },
  blockSubtitle: { fontSize: 9, color: '#64748b', marginTop: 2 },
  
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderBottomWidth: 1, borderBottomColor: '#cbd5e1', marginTop: 5 },
  tableRow: { flexDirection: 'row', padding: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  col1: { width: '50%' },
  col2: { width: '25%', textAlign: 'center' },
  col3: { width: '25%', textAlign: 'right' },
  textBold: { fontSize: 9, fontWeight: 'bold', color: '#1e293b' },
  text: { fontSize: 9, color: '#334155' },
  
  summarySection: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'flex-end' },
  summaryBlock: { width: '50%', paddingLeft: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 2, borderTopColor: '#ea580c' },
  totalLabel: { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
  totalValue: { fontSize: 14, fontWeight: 'bold', color: '#ea580c' }
});

export const BudgetPDF = ({ orcamento, logo }: { orcamento: any, logo?: string | null }) => {
  const itens = orcamento.itens || [];
  
  // Agrupar itens por equipamento + tipo_servico
  const gruposMap = new Map();
  
  itens.forEach((item: any) => {
    const key = `${item.equipamento?.descricao || 'Equipamento Geral'} - ${item.tipo_servico || 'Serviço'}`;
    if (!gruposMap.has(key)) {
      gruposMap.set(key, {
        equipamentoDesc: item.equipamento?.descricao || 'Equipamento Geral',
        local: item.equipamento?.local || '',
        tipoServico: item.tipo_servico || 'Serviço',
        materiais: [],
        maoDeObra: []
      });
    }
    
    if (item.tipo_custo === 'material') {
      gruposMap.get(key).materiais.push(item);
    } else {
      gruposMap.get(key).maoDeObra.push(item);
    }
  });

  const grupos = Array.from(gruposMap.values());

  const totalMateriais = itens.filter((i:any) => i.tipo_custo === 'material').reduce((acc: number, i: any) => acc + i.subtotal, 0);
  const totalMaoDeObra = itens.filter((i:any) => i.tipo_custo !== 'material').reduce((acc: number, i: any) => acc + i.subtotal, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Master Climatização e Elétrica</Text>
            <Text style={styles.subtitle}>Proposta Comercial #{orcamento.id.split('-')[0]}</Text>
          </View>
          {logo && <Image src={logo} style={styles.logo} />}
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{orcamento.cliente?.nome || 'Não informado'}</Text>
            </View>
            <View>
              <Text style={styles.label}>Data do Orçamento</Text>
              <Text style={styles.value}>{new Date(orcamento.created_at).toLocaleDateString('pt-BR')}</Text>
            </View>
          </View>
        </View>

        {grupos.map((grupo: any, index: number) => (
          <View key={index} style={styles.blockGroup}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>{grupo.equipamentoDesc} ({grupo.tipoServico})</Text>
              {grupo.local && <Text style={styles.blockSubtitle}>Local: {grupo.local}</Text>}
            </View>

            {/* Mão de Obra deste bloco */}
            {grupo.maoDeObra.length > 0 && (
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.col1, styles.textBold]}>Mão de Obra / Serviço</Text>
                  <Text style={[styles.col2, styles.textBold]}>Quantidade</Text>
                  <Text style={[styles.col3, styles.textBold]}>Subtotal</Text>
                </View>
                {grupo.maoDeObra.map((item: any, i: number) => (
                  <View style={styles.tableRow} key={`mo-${i}`}>
                    <Text style={[styles.col1, styles.text]}>{item.item_tabela?.nome_item || 'Serviço'}</Text>
                    <Text style={[styles.col2, styles.text]}>{item.quantidade}</Text>
                    <Text style={[styles.col3, styles.text]}>R$ {item.subtotal.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Materiais deste bloco */}
            {grupo.materiais.length > 0 && (
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.col1, styles.textBold]}>Materiais / Peças</Text>
                  <Text style={[styles.col2, styles.textBold]}>Quantidade</Text>
                  <Text style={[styles.col3, styles.textBold]}>Subtotal</Text>
                </View>
                {grupo.materiais.map((item: any, i: number) => (
                  <View style={styles.tableRow} key={`mat-${i}`}>
                    <Text style={[styles.col1, styles.text]}>{item.item_tabela?.nome_item || 'Material'}</Text>
                    <Text style={[styles.col2, styles.text]}>{item.quantidade}</Text>
                    <Text style={[styles.col3, styles.text]}>R$ {item.subtotal.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.summarySection}>
          <View style={styles.summaryBlock}>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Subtotal Materiais:</Text>
              <Text style={styles.value}>R$ {totalMateriais.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Subtotal Mão de Obra:</Text>
              <Text style={styles.value}>R$ {totalMaoDeObra.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryTotal}>
              <Text style={styles.totalLabel}>Valor Total:</Text>
              <Text style={styles.totalValue}>R$ {orcamento.valor_total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
};
