import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center overflow-hidden p-1">
            <img src="/logo-tatboard.png" alt="Tatboard" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-semibold text-navy">Tatboard</span>
        </div>

        <h1 className="text-3xl font-bold text-navy mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-sm text-text-muted mb-8">Dernière mise à jour : 27 mars 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">1. Éditeur du service</h2>
            <p>
              Le service Tatboard est édité par <strong>CIPHERLABS LIMITED</strong>, société enregistrée en Irlande.<br />
              Siège social : Pod 2, The Old Station House, Blackrock, Dublin, A94 T8P8, Ireland.<br />
              Company Number : 803231.<br />
              Contact : <a href="mailto:contact@tatboard.app" className="text-accent hover:underline">contact@tatboard.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">2. Objet du service</h2>
            <p>
              Tatboard est une application web de gestion de clientèle (CRM) destinée aux tatoueurs et studios de tatouage.
              Elle permet de gérer les fiches clients, l'agenda des rendez-vous, la comptabilité simplifiée et les documents associés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">3. Acceptation des conditions</h2>
            <p>
              L'utilisation de Tatboard implique l'acceptation pleine et entière des présentes conditions générales d'utilisation.
              En créant un compte, l'utilisateur reconnaît avoir lu, compris et accepté l'intégralité de ces conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">4. Inscription et compte utilisateur</h2>
            <p>
              Pour utiliser Tatboard, l'utilisateur doit créer un compte en fournissant une adresse email valide et un mot de passe.
              L'utilisateur est responsable de la confidentialité de ses identifiants de connexion et de toute activité effectuée sous son compte.
              L'utilisateur s'engage à fournir des informations exactes et à les maintenir à jour.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">5. Essai gratuit et abonnement</h2>
            <p>
              Tatboard propose un essai gratuit de 7 jours à compter de la date d'inscription.
              Pendant cette période, l'utilisateur bénéficie de l'ensemble des fonctionnalités de l'application.
            </p>
            <p>
              À l'issue de la période d'essai, l'utilisateur doit souscrire un abonnement Pro au tarif de 19,99 € par mois
              pour continuer à utiliser le service. L'abonnement est résiliable à tout moment depuis la page Réglages
              ou le portail de gestion Stripe. La résiliation prend effet à la fin de la période de facturation en cours.
            </p>
            <p>
              Les paiements sont gérés par <strong>Stripe</strong>, prestataire de paiement certifié PCI-DSS.
              Tatboard ne stocke aucune information de carte bancaire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">6. Données de l'utilisateur</h2>
            <p>
              L'utilisateur reste propriétaire de l'ensemble des données qu'il saisit dans Tatboard
              (fiches clients, rendez-vous, entrées financières, photos, documents).
              Tatboard s'engage à ne pas utiliser, vendre ou transmettre ces données à des tiers.
            </p>
            <p>
              L'utilisateur peut supprimer son compte et l'ensemble de ses données à tout moment
              depuis la section « Zone dangereuse » de la page Réglages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">7. Hébergement et sécurité</h2>
            <p>
              L'application est hébergée sur <strong>Vercel</strong> (USA/EU).
              La base de données est hébergée sur <strong>Supabase</strong>, avec des serveurs situés en Union européenne (Irlande).
              Les données de chaque utilisateur sont isolées grâce au mécanisme de Row Level Security (RLS) de PostgreSQL.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">8. Disponibilité du service</h2>
            <p>
              Tatboard s'efforce d'assurer une disponibilité continue du service.
              Toutefois, des interruptions temporaires peuvent survenir pour des raisons de maintenance,
              de mise à jour ou de force majeure. Tatboard ne saurait être tenu responsable des conséquences
              de ces interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">9. Limitation de responsabilité</h2>
            <p>
              Tatboard est fourni « en l'état ». L'éditeur ne garantit pas l'absence d'erreurs ou de bugs.
              L'utilisateur utilise le service sous sa propre responsabilité.
              En aucun cas, CIPHERLABS LIMITED ne pourra être tenue responsable des dommages directs ou indirects
              résultant de l'utilisation ou de l'impossibilité d'utiliser le service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">10. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments constituant Tatboard (design, code, marque, logo)
              sont la propriété exclusive de CIPHERLABS LIMITED.
              Toute reproduction, distribution ou utilisation non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">11. Modification des conditions</h2>
            <p>
              CIPHERLABS LIMITED se réserve le droit de modifier les présentes conditions à tout moment.
              Les utilisateurs seront informés de toute modification substantielle par email ou notification dans l'application.
              La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">12. Droit applicable et juridiction</h2>
            <p>
              Les présentes conditions sont régies par le droit irlandais.
              Tout litige relatif à l'interprétation ou l'exécution des présentes conditions
              sera soumis aux tribunaux compétents de Dublin, Irlande.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy mt-8 mb-3">13. Contact</h2>
            <p>
              Pour toute question relative aux présentes conditions, contactez-nous à :{' '}
              <a href="mailto:contact@tatboard.app" className="text-accent hover:underline">contact@tatboard.app</a>
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
