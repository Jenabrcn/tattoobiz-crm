import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center overflow-hidden p-1">
            <img src="/logo-tatboard.png" alt="Tatboard" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-semibold text-navy">Tatboard</span>
        </div>

        <h1 className="text-3xl font-bold text-navy mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-text-muted mb-8">Dernière mise à jour : 27 mars 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles est <strong>CIPHERLABS LIMITED</strong>.<br />
              Siège social : Pod 2, The Old Station House, Blackrock, Dublin, A94 T8P8, Ireland.<br />
              Company Number : 803231.<br />
              Contact : <a href="mailto:contact@tatboard.app" className="text-accent hover:underline">contact@tatboard.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">2. Données personnelles collectées</h2>
            <p>Dans le cadre de l'utilisation de Tatboard, nous collectons les données suivantes :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Données du compte</strong> : prénom, nom, adresse email, mot de passe (hashé)</li>
              <li><strong>Données professionnelles</strong> : nom du studio, adresse du studio, numéro SIRET</li>
              <li><strong>Données clients</strong> : nom, prénom, email, téléphone, Instagram, ville, notes des clients de l'utilisateur</li>
              <li><strong>Données de rendez-vous</strong> : dates, heures, durées, types, descriptions</li>
              <li><strong>Données financières</strong> : montants, descriptions, catégories, modes de paiement, factures/justificatifs uploadés</li>
              <li><strong>Photos</strong> : photos de réalisations, consentements éclairés, fiches de soin</li>
              <li><strong>Données de facturation</strong> : gérées par Stripe (nom, adresse de facturation, informations de carte bancaire)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">3. Finalité du traitement</h2>
            <p>Les données collectées sont utilisées exclusivement pour :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Fournir et maintenir le service Tatboard</li>
              <li>Gérer le compte utilisateur et l'authentification</li>
              <li>Traiter les paiements d'abonnement via Stripe</li>
              <li>Envoyer des communications relatives au service (confirmation d'inscription, réinitialisation de mot de passe)</li>
              <li>Améliorer le service et corriger les bugs</li>
            </ul>
            <p className="mt-3 font-medium text-navy">
              Aucune donnée personnelle n'est vendue, louée ou transmise à des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">4. Base légale du traitement</h2>
            <p>Le traitement des données repose sur :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>L'exécution du contrat</strong> : les données sont nécessaires à la fourniture du service souscrit</li>
              <li><strong>Le consentement</strong> : l'utilisateur accepte les présentes conditions lors de son inscription</li>
              <li><strong>L'intérêt légitime</strong> : amélioration du service et sécurité</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">5. Hébergement et stockage des données</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Application</strong> : hébergée sur Vercel (serveurs USA et EU)</li>
              <li><strong>Base de données</strong> : hébergée sur Supabase, serveurs situés en Union européenne (Irlande)</li>
              <li><strong>Fichiers et photos</strong> : stockés sur Supabase Storage (EU, Irlande)</li>
              <li><strong>Paiements</strong> : traités par Stripe, certifié PCI-DSS Level 1</li>
            </ul>
            <p className="mt-3">
              Les données de chaque utilisateur sont strictement isolées grâce au mécanisme de
              Row Level Security (RLS) de PostgreSQL. Aucun utilisateur ne peut accéder aux données d'un autre utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">6. Cookies</h2>
            <p>
              Tatboard utilise uniquement les <strong>cookies techniques strictement nécessaires</strong> au fonctionnement du service :
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Cookie de session d'authentification Supabase</li>
              <li>Aucun cookie publicitaire, de tracking ou d'analyse</li>
              <li>Aucun cookie tiers à des fins marketing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">7. Durée de conservation</h2>
            <p>
              Les données personnelles sont conservées tant que le compte utilisateur est actif.
              En cas de suppression du compte par l'utilisateur (depuis la page Réglages),
              l'ensemble des données associées est supprimé immédiatement et de manière irréversible.
            </p>
            <p>
              Les données de facturation gérées par Stripe sont conservées conformément aux obligations
              légales et fiscales applicables.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">8. Droits de l'utilisateur</h2>
            <p>Conformément au Règlement Général sur la Protection des Données (RGPD), l'utilisateur dispose des droits suivants :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Droit d'accès</strong> : consulter les données personnelles détenues</li>
              <li><strong>Droit de rectification</strong> : modifier ses données depuis la page Réglages</li>
              <li><strong>Droit à l'effacement</strong> : supprimer son compte et toutes ses données depuis la page Réglages</li>
              <li><strong>Droit à la portabilité</strong> : exporter ses données au format CSV depuis les pages Clients et Finances</li>
              <li><strong>Droit d'opposition</strong> : s'opposer au traitement de ses données</li>
              <li><strong>Droit de limitation</strong> : demander la limitation du traitement</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à :{' '}
              <a href="mailto:contact@tatboard.app" className="text-accent hover:underline">contact@tatboard.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">9. Sous-traitants</h2>
            <p>Les sous-traitants suivants interviennent dans le traitement des données :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Supabase</strong> (Singapour) : hébergement de la base de données et des fichiers (serveurs EU, Irlande)</li>
              <li><strong>Vercel</strong> (USA) : hébergement de l'application web</li>
              <li><strong>Stripe</strong> (USA) : traitement des paiements</li>
            </ul>
            <p className="mt-3">
              Ces prestataires sont conformes au RGPD et disposent de garanties contractuelles
              appropriées pour le transfert de données hors de l'Union européenne.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">10. Sécurité des données</h2>
            <p>Nous mettons en oeuvre les mesures de sécurité suivantes :</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Chiffrement des données en transit (HTTPS/TLS)</li>
              <li>Chiffrement des données au repos sur Supabase</li>
              <li>Mots de passe hashés (bcrypt)</li>
              <li>Isolation des données par utilisateur (Row Level Security)</li>
              <li>Authentification sécurisée via Supabase Auth (JWT)</li>
              <li>Aucun stockage d'informations de carte bancaire (délégué à Stripe)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">11. Modification de la politique</h2>
            <p>
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment.
              Les utilisateurs seront informés de toute modification substantielle.
              La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">12. Contact et réclamation</h2>
            <p>
              Pour toute question relative à la protection de vos données personnelles :{' '}
              <a href="mailto:contact@tatboard.app" className="text-accent hover:underline">contact@tatboard.app</a>
            </p>
            <p className="mt-2">
              Vous avez également le droit d'introduire une réclamation auprès de l'autorité de contrôle compétente
              (Data Protection Commission en Irlande, ou la CNIL si vous résidez en France).
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link to="/login" className="text-sm text-accent hover:underline">← Retour à la connexion</Link>
        </div>
      </div>
    </div>
  )
}
