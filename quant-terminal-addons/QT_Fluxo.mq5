//+------------------------------------------------------------------+
//| QT_Fluxo.mq5 - grava os negocios (Times & Trades) do WIN e do    |
//| WDO para o Quant Terminal, em tempo real.                        |
//| SO LE DADOS: este robo nao envia, altera nem cancela ordens.     |
//|                                                                  |
//| Grava em <pasta comum do MetaTrader>\Files\qt_WIN_AAAAMMDD.csv   |
//| (e qt_WDO_...), uma linha por negocio:                           |
//|   tempo_ms;preco;quantidade;lado                                 |
//| lado: 1 = agressor comprador, -1 = agressor vendedor, 0 = sem    |
//| agressor (leilao/cruzamento). O horario e o do servidor da       |
//| corretora (para a B3, normalmente o de Brasilia).                |
//+------------------------------------------------------------------+
#property copyright "Quant Terminal - uso pessoal"
#property version   "1.00"
#property description "Grava os negocios do WIN e do WDO para o Quant Terminal. So le dados: nao envia ordens."

input string Simbolos   = "WIN$N;WDO$N"; // Simbolos separados por ; (ex.: WINZ26;WDOF27)
input int    IntervaloMs = 1000;          // De quanto em quanto tempo gravar (milissegundos)

string sims[];
long   ultimo[];   // tempo (ms) do ultimo negocio gravado
int    naMesma[];  // quantos negocios ja gravados com esse mesmo tempo

//--- nome do ativo no arquivo: WIN ou WDO (as 3 primeiras letras)
string Ativo(const string s) { return StringSubstr(s, 0, 3); }

string NomeArquivo(const string s, const long msc)
  {
   MqlDateTime d;
   TimeToStruct((datetime)(msc / 1000), d);
   return StringFormat("qt_%s_%04d%02d%02d.csv", Ativo(s), d.year, d.mon, d.day);
  }

//--- se o arquivo de hoje ja existe (robo reiniciado), continua de onde parou
void RetomarDoArquivo(const int i)
  {
   string arq = NomeArquivo(sims[i], ultimo[i]);
   int h = FileOpen(arq, FILE_READ | FILE_TXT | FILE_ANSI | FILE_COMMON | FILE_SHARE_READ | FILE_SHARE_WRITE);
   if(h == INVALID_HANDLE)
      return;
   ulong tam = FileSize(h);
   if(tam > 8192)
     {
      FileSeek(h, (long)tam - 8192, SEEK_SET);
      FileReadString(h); // linha cortada pela metade
     }
   long ult = 0;
   int cont = 0;
   while(!FileIsEnding(h))
     {
      string linha = FileReadString(h);
      if(StringLen(linha) < 5)
         continue;
      string partes[];
      if(StringSplit(linha, ';', partes) < 4)
         continue;
      long t = StringToInteger(partes[0]);
      if(t == ult)
         cont++;
      else
        {
         ult = t;
         cont = 1;
        }
     }
   FileClose(h);
   if(ult > 0)
     {
      ultimo[i] = ult;
      naMesma[i] = cont;
     }
  }

int OnInit()
  {
   int n = StringSplit(Simbolos, ';', sims);
   if(n <= 0)
     {
      Print("QT_Fluxo: informe os simbolos, ex.: WIN$N;WDO$N");
      return(INIT_PARAMETERS_INCORRECT);
     }
   ArrayResize(ultimo, n);
   ArrayResize(naMesma, n);
   MqlDateTime d;
   TimeToStruct(TimeCurrent(), d);
   d.hour = 0;
   d.min = 0;
   d.sec = 0;
   long inicioDia = (long)StructToTime(d) * 1000;
   for(int i = 0; i < n; i++)
     {
      StringTrimLeft(sims[i]);
      StringTrimRight(sims[i]);
      if(!SymbolSelect(sims[i], true))
         PrintFormat("QT_Fluxo: nao achei o simbolo %s na sua corretora. Confira o nome em Simbolos.", sims[i]);
      ultimo[i] = inicioDia; // primeira vez no dia: grava desde a abertura
      naMesma[i] = 0;
      RetomarDoArquivo(i);
     }
   EventSetMillisecondTimer(MathMax(200, IntervaloMs));
   PrintFormat("QT_Fluxo: gravando %s na pasta comum do MetaTrader (Files). So leitura, nenhuma ordem.", Simbolos);
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
  }

void OnTimer()
  {
   for(int i = 0; i < ArraySize(sims); i++)
      Gravar(i);
  }

void Gravar(const int i)
  {
   MqlTick t[];
   long desde = ultimo[i];
   int n = CopyTicksRange(sims[i], t, COPY_TICKS_TRADE, (ulong)desde, 0);
   if(n <= 0)
      return;
   // pula os negocios que ja foram gravados com o mesmo milissegundo do ultimo
   int pula = 0;
   while(pula < n && pula < naMesma[i] && t[pula].time_msc == desde)
      pula++;
   if(pula >= n)
      return;
   string arq = NomeArquivo(sims[i], t[n - 1].time_msc);
   int h = FileOpen(arq, FILE_READ | FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_COMMON | FILE_SHARE_READ | FILE_SHARE_WRITE);
   if(h == INVALID_HANDLE)
     {
      PrintFormat("QT_Fluxo: nao consegui abrir %s (erro %d)", arq, GetLastError());
      return;
     }
   FileSeek(h, 0, SEEK_END);
   for(int k = pula; k < n; k++)
     {
      int lado = 0;
      if((t[k].flags & TICK_FLAG_BUY) == TICK_FLAG_BUY && (t[k].flags & TICK_FLAG_SELL) != TICK_FLAG_SELL)
         lado = 1;
      else
         if((t[k].flags & TICK_FLAG_SELL) == TICK_FLAG_SELL && (t[k].flags & TICK_FLAG_BUY) != TICK_FLAG_BUY)
            lado = -1;
      FileWriteString(h, StringFormat("%I64d;%s;%I64u;%d\r\n", t[k].time_msc, DoubleToString(t[k].last, 2), t[k].volume, lado));
     }
   FileClose(h);
   // guarda onde parou: o ultimo tempo e quantos negocios tem nesse tempo
   long novo = t[n - 1].time_msc;
   int cont = 0;
   for(int k = n - 1; k >= 0 && t[k].time_msc == novo; k--)
      cont++;
   ultimo[i] = novo;
   naMesma[i] = cont;
  }
//+------------------------------------------------------------------+
