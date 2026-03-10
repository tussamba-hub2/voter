import React, { useEffect, useState, useMemo } from "react";
import supabase from "../../lib/supabaseClient";

const avatarPlaceholder = "/avatar.png";
const STORAGE_KEY = "voter_vote";
const nifRegex = /^\d{9}[A-Za-z]{2}\d{3}$/;

export default function VotePage() {
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [nif, setNif] = useState("");
  const [localVote, setLocalVote] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setLocalVote(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchWinner(); // Fetch winner data
  }, []);

  const fetchWinner = async () => {
    try {
      const { data, error } = await supabase
        .from("winner")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        // attempt to fetch foto_url from candidatos if candidato_id present
        let foto_url = null;
        if (data.candidato_id) {
          const { data: cand, error: candErr } = await supabase
            .from("candidatos")
            .select("foto_url")
            .eq("id", data.candidato_id)
            .maybeSingle();
          if (!candErr && cand) foto_url = cand.foto_url;
        }
        setWinner({ ...data, foto_url });
      }
    } catch (err) {
      // non-fatal: show error notification
      setErrorMessage(err.message || "Erro ao carregar vencedor.");
      setShowErrorNotification(true);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: candidatos, error: candErr } = await supabase
        .from("candidatos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (candErr) throw candErr;

      const { data: votosData, error: votosErr } = await supabase
        .from("votos")
        .select("candidato_id");

      if (votosErr) throw votosErr;

      // tally votes
      const counts = {};
      (votosData || []).forEach((v) => {
        counts[v.candidato_id] = (counts[v.candidato_id] || 0) + 1;
      });

      const enriched = (candidatos || []).map((c) => ({
        ...c,
        votos: counts[c.id] || 0,
      }));
      setCandidates(enriched);
      setVotes(votosData || []);
    } catch (err) {
      setErrorMessage(err.message || "Erro ao carregar candidatos.");
      setShowErrorNotification(true);
    } finally {
      setLoading(false);
    }
  };

  const openVoteModal = (candidate) => {
    setSelectedCandidate(candidate);
    setModalOpen(true);
    setShowErrorNotification(false);
    setShowSuccessNotification(false);
    setNif("");
  };

  const handleCancel = () => {
    setModalOpen(false);
    setSelectedCandidate(null);
    setNif("");
  };

  const handleVote = async () => {
    setShowErrorNotification(false);
    setShowSuccessNotification(false);
    const trimmed = nif.trim().toUpperCase();
    if (!nifRegex.test(trimmed)) {
      setErrorMessage(
        "Formato de NIF inválido. Formato esperado: 9 dígitos, 2 letras, 3 dígitos.",
      );
      setShowErrorNotification(true);
      return;
    }

    if (!selectedCandidate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("votos")
        .insert([
          { candidato_id: selectedCandidate.id, trabalhador_id: trimmed },
        ]);

      if (error) throw error;

      // update localStorage
      const payload = { nif: trimmed, candidateId: selectedCandidate.id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLocalVote(payload);

      // update local state counts
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selectedCandidate.id
            ? { ...c, votos: (c.votos || 0) + 1 }
            : c,
        ),
      );

      setShowSuccessNotification(true);
      setModalOpen(false);
      setSelectedCandidate(null);
    } catch (err) {
      setErrorMessage(err.message || "Erro ao registar voto.");
      setShowErrorNotification(true);
    } finally {
      setLoading(false);
    }
  };

  const userHasVoted = !!localVote;
  const filteredCandidates = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const source = (candidates || []).slice();
    const list = !q
      ? source
      : source.filter((c) => {
          const nome = (c.nome || "").toLowerCase();
          const gabinete = (c.gabinete || "").toLowerCase();
          return nome.includes(q) || gabinete.includes(q);
        });

    if (localVote?.candidateId) {
      const idx = list.findIndex((c) => c.id === localVote.candidateId);
      if (idx > 0) {
        const [voted] = list.splice(idx, 1);
        list.unshift(voted);
      }
    }

    return list;
  }, [candidates, search, localVote]);

  return (
    <div className="center-content-vote with-to">
      {winner && (
        <div className="center-max-width d-flex column g-36px">
            <div className="d-flex items-center justify-center all-center column g-20px winner">
                <div className="d-flex column g-20px">
                    <span className="color-primary super-bold text-center">
                        Vencedor
                    </span>
                    <img
                    src={winner.foto_url || avatarPlaceholder}
                    alt={winner.nome}
                    className="winner-image"
                />
                </div>
                <div className="d-flex column g-12px">
                    <b className="size-24 super-bold text-center" title={winner.nome}>
                      {winner.nome}
                    </b>
                    <span className="extra-bold text-center uppercase size-16">
                        {winner.gabinete}
                      </span>
                      <span className="size-16 text-center color-primary super-bold">
                        {winner.total_votos ?? 0}{" "}
                        <span className="size-16 text-center color-opac">Votos</span>
                      </span>
                </div>
            </div>
          
        </div>
      )}

      {!winner && (
        <div className="center-max-width d-flex column g-36px">
          <div className="d-flex column g-36px abs-on-search-candidate">
            <div className="search-input">
              <i className="fi fi-sr-search"></i>
              <input
                type="text"
                placeholder="Pesquisar nome do candidato"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="d-flex column g-20px">
            <span className="color-opac">Candidatos</span>

            <div className="products-listing w-full">
              {(filteredCandidates || []).map((cand) => (
                <div
                  key={cand.id}
                  className={`product-card relative d-flex column justify-between g-4px ${localVote?.candidateId === cand.id ? "my-vote" : ""}`}
                >
                  <div className="d-flex column g-8px">
                    <img
                      src={cand.foto_url || avatarPlaceholder}
                      alt={cand.nome}
                    />
                    <div className="d-flex column g-8px">
                      <b className="size-12-480px" title={cand.nome}>
                        {cand.nome}
                      </b>
                      <div className="d-flex column g-8px justify-between">
                        <span className="extra-bold size-12-480px uppercase">
                          {cand.gabinete}
                        </span>
                        {/*<span className="size-12">
                            {cand.votos || 0}{" "}
                            <span className="size-12 color-opac">Votos</span>
                        </span>*/}
                      </div>
                    </div>
                  </div>
                  {!userHasVoted && (
                    <button
                      className="d-flex items-center g-12px btn-add"
                      onClick={() => openVoteModal(cand)}
                    >
                      <i className="fi fi-sr-pennant"></i>
                      <span className="appear-480px size-12">Votar neste</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalOpen && selectedCandidate && (
        <div className="abs-container-shade d-flex items-center justify-center">
          <div className="min-form">
            <div className="w-full d-flex items-center justify-center column">
              <h2 className="bold size-16 p-16 br-bt w-full">
                Votar em "{selectedCandidate.nome}"?
              </h2>

              <div className="p-16 d-flex column g-20px w-full">
                {showSuccessNotification && (
                  <div className="some-notification success-notification">
                    <div className="d-flex items-center g-12px">
                      <i className="fi fi-sr-check-circle"></i>
                      <span className="super-bold nowrap">
                        Voto registado com sucesso
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

                <div className="d-flex column g-8px">
                  <label htmlFor="bi" className="color-opac">
                    Seu NIF
                  </label>
                  <input
                    id="bi"
                    type="text"
                    placeholder="000000000AA000"
                    className="input"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                  />
                </div>

                <div className="d-flex w-full items-center justify-end g-20px p-16 br-tp">
                  <button
                    className="btn btn-br"
                    type="button"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleVote}
                    disabled={loading}
                  >
                    {loading ? "A processar..." : "Votar agora"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
