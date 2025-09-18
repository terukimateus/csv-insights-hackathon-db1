# Relatório de Desenvolvimento: Gerador de Gráficos e Insights a partir de CSV usando IA

## Resumo

Durante o desenvolvimento da solução para gerar gráficos e insights a partir de um CSV aleatório, utilizando IA, identificamos facilidades e dificuldades que detalhamos a seguir.

### 1. Gestão de Segredos

Para proteger informações sensíveis, sugerimos o uso de variáveis de ambiente. A geração do código seguiu esta recomendação.

### 2. Uso de Modelos Enxutos

Optamos por um modelo mais limpo e simplificado. No entanto, durante algumas análises da mesma planilha, o modelo apresentou **alucinações nos resultados**, ou seja, informações que não representavam a realidade.

### 3. Ajustes Manuais

Alguns ajustes foram realizados diretamente no código gerado para corrigir inconsistências ou melhorar a precisão dos resultados.

### 4. Limitações do Modelo

O modelo utilizado, por ser enxuto e limitado, apresentou divergências na análise de dados. Acreditamos que isso contribuiu para as alucinações observadas.

### 5. Compreensão de Insights

Alguns insights gerados pelo modelo não foram facilmente compreensíveis. Houve casos em que a interpretação do gráfico gerado parecia indicar uma conclusão, mas, ao avaliar os dados contidos, percebemos que a sugestão era ambígua.

## Conclusão

Apesar das limitações e alucinações pontuais, a solução demonstrou capacidade de gerar gráficos e insights automáticos a partir de CSVs, sendo necessário apenas ajustes e validações manuais para garantir a precisão e clareza das informações.
