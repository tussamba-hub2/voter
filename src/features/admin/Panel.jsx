import { useState } from "react";
import { jsPDF } from "jspdf";
import supabase from "../../lib/supabaseClient";

export default function Panel() {
  const [loading, setLoading] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePublish = async () => {
    setShowErrorNotification(false);
    setShowSuccessNotification(false);
    setErrorMessage("");
    setLoading(true);
    try {
      const { data: candidatos, error: candErr } = await supabase
        .from("candidatos")
        .select("id, nome, gabinete")
        .order("criado_em", { ascending: false });

      if (candErr) throw candErr;

      const { data: votosData, error: votosErr } = await supabase
        .from("votos")
        .select("candidato_id");

      if (votosErr) throw votosErr;

      const counts = {};
      (votosData || []).forEach((v) => {
        counts[v.candidato_id] = (counts[v.candidato_id] || 0) + 1;
      });

      const enriched = (candidatos || []).map((c) => ({
        ...c,
        total_votos: counts[c.id] || 0,
      }));

      // sort desc by votes
      enriched.sort((a, b) => (b.total_votos || 0) - (a.total_votos || 0));

      // generate PDF
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Resultados da eleição", 14, 16);
      doc.setFontSize(10);

      let y = 28;
      enriched.forEach((c, idx) => {
        const line = `${idx + 1}. ${c.nome} — ${c.gabinete} — ${c.total_votos || 0} votos`;
        doc.text(line, 14, y);
        y += 8;
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
      });

      doc.save("resultados.pdf");

      // insert top winner into `winner` table (single row id=1)
      if (enriched.length > 0) {
        const top = enriched[0];
        const upsertRow = {
          id: 1,
          candidato_id: top.id,
          nome: top.nome,
          gabinete: top.gabinete,
          total_votos: top.total_votos || 0,
        };

        const { error: upsertErr } = await supabase
          .from("winner")
          .upsert([upsertRow], { onConflict: "id" });

        if (upsertErr) throw upsertErr;
      }

      setShowSuccessNotification(true);
    } catch (err) {
      setErrorMessage(err.message || "Erro ao publicar vencedor.");
      setShowErrorNotification(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="all-center">
      {showSuccessNotification && (
        <div className="some-notification success-notification">
          <div className="d-flex items-center g-12px">
            <i className="fi fi-sr-check-circle"></i>
            <span className="super-bold nowrap">
              Resultados publicados com sucesso
            </span>
          </div>
        </div>
      )}

      {showErrorNotification && (
        <div className="some-notification error-notification">
          <div className="d-flex items-center g-12px">
            <i className="fi fi-sr-bug"></i>
            <span className="super-bold nowrap">{errorMessage}</span>
          </div>
        </div>
      )}

      <button
        className="btn huge-btn btn-primary"
        onClick={handlePublish}
        disabled={loading}
      >
        <i className="fi fi-sr-pennant"></i>
        <span>{loading ? "A publicar..." : "Publicar vencedor"}</span>
      </button>
    </div>
  );
}
