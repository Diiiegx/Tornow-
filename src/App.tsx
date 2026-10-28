/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { AppHeader } from './components/AppHeader';
import { DashboardHomeView } from './components/DashboardHomeView';
import { StandingsView } from './components/StandingsView';
import { CalendarView } from './components/CalendarView';
import { LiveScoreView } from './components/LiveScoreView';
import { ClubAdminView } from './components/ClubAdminView';
import { AdminPanelView } from './components/AdminPanelView';
import { OrganizerDashboardView } from './components/OrganizerDashboardView';
import { PublicHomeLandingView } from './components/PublicHomeLandingView';
import { AuthModal } from './components/AuthModal';
import { PushToastContainer } from './components/PushToastContainer';
import { BottomNavDock, NavTabType } from './components/BottomNavDock';
import { CreateTournamentModal } from './components/CreateTournamentModal';
import { TournamentSelectorModal } from './components/TournamentSelectorModal';
import { MyTournamentsView } from './components/MyTournamentsView';
import { AccountSettingsView } from './components/AccountSettingsView';
import { HourlyFeedbackPopup } from './components/HourlyFeedbackPopup';

const VALID_TABS: NavTabType[] = [
  'resumen',
  'calendario',
  'posiciones',
  'mistorneos',
  'cuenta',
  'organizer',
  'marcador',
  'club',
  'admin',
];

function TournamentMain() {
  const [activeTab, setActiveTab] = useState<NavTabType>('resumen');
  const [selectedClubForView, setSelectedClubForView] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'invite' | 'organizer_key'>('login');
  const [inviteKeyParam, setInviteKeyParam] = useState<string>('');

  // TORNOW Tournament Modals
  const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);
  const [isSelectTournamentOpen, setIsSelectTournamentOpen] = useState(false);

  const { setActiveLiveMatchId, setActiveTournamentId, tournaments, clubs, currentUser } = useTournament();

  // Role Access: Visitors and basic usuarios only see the public landing screen (or Mi Cuenta login screen)
  const isGuestOrBasicUser = !currentUser || currentUser.role === 'usuario';

  // Track previous user so logging out from any screen immediately redirects to Inicio ('resumen')
  const prevUserIdRef = React.useRef<string | undefined>(currentUser?.id);
  useEffect(() => {
    if (prevUserIdRef.current && !currentUser) {
      setActiveTab('resumen');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    }
    prevUserIdRef.current = currentUser?.id;
  }, [currentUser]);

  // Keep selected club in sync with available clubs or user club
  useEffect(() => {
    if (currentUser?.clubId) {
      setSelectedClubForView(currentUser.clubId);
    } else if (clubs.length > 0 && !selectedClubForView) {
      setSelectedClubForView(clubs[0].id);
    }
  }, [clubs, currentUser, selectedClubForView]);

  // Support direct invitation and shared tournament links via ?invite=KEY, ?tournament=ID, ?tab=TAB
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const inviteKey = params.get('invite');
      if (inviteKey) {
        setInviteKeyParam(inviteKey.trim());
        setAuthMode('invite');
        setIsAuthModalOpen(true);
      }

      const tourId = params.get('tournament');
      if (tourId && tournaments.some((t) => t.id === tourId.trim())) {
        setActiveTournamentId(tourId.trim());
      }

      const tabParam = params.get('tab') as NavTabType | null;
      if (tabParam && VALID_TABS.includes(tabParam)) {
        if (!isGuestOrBasicUser || tabParam === 'resumen' || tabParam === 'cuenta') {
          setActiveTab(tabParam);
        }
      }
    }
  }, [tournaments, setActiveTournamentId, isGuestOrBasicUser]);

  const scrollToTopInstant = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  const handleNavigateToClub = useCallback((clubId: string) => {
    setSelectedClubForView(clubId);
    setActiveTab('club');
    scrollToTopInstant();
  }, [scrollToTopInstant]);

  const handleOpenLiveScorer = useCallback((matchId: string) => {
    setActiveLiveMatchId(matchId);
    setActiveTab('marcador');
    scrollToTopInstant();
  }, [setActiveLiveMatchId, scrollToTopInstant]);

  const handleOpenAuth = useCallback((mode: 'login' | 'invite' | 'organizer_key' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleOpenCreateOfficial = useCallback(() => {
    setIsCreateTournamentOpen(true);
  }, []);

  const handleScrollToQuote = useCallback(() => {
    const el = document.getElementById('cotizador');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActiveTab('resumen');
      setTimeout(() => {
        const target = document.getElementById('cotizador');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  // Safe tab switcher that enforces strict RBAC and resets scroll position
  const handleSafeTabChange = useCallback((targetTab: NavTabType) => {
    if (isGuestOrBasicUser && targetTab !== 'resumen' && targetTab !== 'cuenta') {
      handleOpenAuth('login');
      return;
    }

    if (currentUser?.role === 'club_admin' && (targetTab === 'admin' || targetTab === 'organizer')) {
      setActiveTab('club');
      scrollToTopInstant();
      return;
    }

    if (currentUser?.role === 'organizer' && targetTab === 'admin') {
      setActiveTab('organizer');
      scrollToTopInstant();
      return;
    }

    setActiveTab(targetTab);
    scrollToTopInstant();
  }, [isGuestOrBasicUser, currentUser?.role, handleOpenAuth, scrollToTopInstant]);

  return (
    <div className="min-h-screen w-full bg-[#f0f2f7] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col relative selection:bg-[#0052fe] selection:text-white">
      {/* Toast Alert Push System */}
      <PushToastContainer />

      {/* Main Container: Narrow & compact on mobile, full-width expansive on desktop/computer */}
      <div className="w-full max-w-md sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto flex-1 flex flex-col px-2.5 sm:px-5 lg:px-8 xl:px-12">
        {/* Top Header: 3-Line Menu Left, TORNOW Logo Center, Notifications Right */}
        <div className="pt-1">
          <AppHeader
            onOpenAuth={handleOpenAuth}
            onOpenCreateTournament={handleOpenCreateOfficial}
            onOpenSelectTournament={() => setIsSelectTournamentOpen(true)}
            onSelectMatchFromNotif={(matchId) => {
              setActiveLiveMatchId(matchId);
              setActiveTab('calendario');
            }}
            onSelectClubFromNotif={handleNavigateToClub}
            activeTab={activeTab}
            setActiveTab={handleSafeTabChange}
          />
        </div>

        {/* Dynamic Tab Body with bottom padding for navigation dock */}
        <main className="flex-1 pt-1 pb-28">
          {activeTab === 'resumen' && (
            isGuestOrBasicUser ? (
              <PublicHomeLandingView onOpenAuth={handleOpenAuth} />
            ) : (
              <DashboardHomeView
                onNavigateToTab={handleSafeTabChange}
                onNavigateToClub={handleNavigateToClub}
                onOpenSelectTournament={() => setIsSelectTournamentOpen(true)}
              />
            )
          )}

          {activeTab === 'calendario' && (
            <CalendarView
              onOpenLiveScorer={handleOpenLiveScorer}
              onNavigateToClub={handleNavigateToClub}
            />
          )}

          {activeTab === 'posiciones' && (
            <StandingsView
              onNavigateToClub={handleNavigateToClub}
              onNavigateToCalendar={() => setActiveTab('calendario')}
              onOpenNotifyModal={() => setActiveTab('admin')}
            />
          )}

          {activeTab === 'mistorneos' && (
            <MyTournamentsView
              onNavigateToTab={handleSafeTabChange}
              onOpenCreateTournament={handleOpenCreateOfficial}
            />
          )}

          {activeTab === 'cuenta' && (
            <AccountSettingsView
              onOpenAuth={handleOpenAuth}
              onNavigateToTab={handleSafeTabChange}
            />
          )}

          {activeTab === 'organizer' && (
            <OrganizerDashboardView
              onOpenLiveScore={handleOpenLiveScorer}
              onNavigateToClub={handleNavigateToClub}
              onOpenCreateTournament={handleOpenCreateOfficial}
            />
          )}

          {activeTab === 'marcador' && (
            <LiveScoreView
              onOpenAdminPanel={() => (currentUser?.role === 'organizer' ? setActiveTab('organizer') : setActiveTab('admin'))}
              onNavigateToClub={handleNavigateToClub}
            />
          )}

          {activeTab === 'club' && (
            <ClubAdminView
              initialClubId={selectedClubForView}
              onOpenLiveMatch={handleOpenLiveScorer}
              onNavigateToAdmin={() => setActiveTab('admin')}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanelView onOpenTournamentConfig={() => setActiveTab('organizer')} />
          )}
        </main>

        {/* Floating Bottom Navigation Capsule Dock */}
        <BottomNavDock
          activeTab={activeTab}
          setActiveTab={handleSafeTabChange}
          onOpenAuth={handleOpenAuth}
          onOpenCreateTournament={handleOpenCreateOfficial}
          onOpenSelectTournament={() => setIsSelectTournamentOpen(true)}
          onOpenQuote={handleScrollToQuote}
        />
      </div>

      {/* Custom Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setInviteKeyParam('');
        }}
        defaultMode={authMode}
        initialInviteKey={inviteKeyParam}
      />

      {/* TORNOW Tournament Creator Wizard Modal */}
      <CreateTournamentModal
        isOpen={isCreateTournamentOpen}
        onClose={() => setIsCreateTournamentOpen(false)}
        onSuccess={() => {
          if (currentUser?.role === 'organizer' || currentUser?.role === 'super_admin') {
            setActiveTab('organizer');
          } else {
            setActiveTab('resumen');
          }
        }}
      />

      {/* TORNOW Tournament Switcher Modal */}
      <TournamentSelectorModal
        isOpen={isSelectTournamentOpen}
        onClose={() => setIsSelectTournamentOpen(false)}
        onOpenCreate={handleOpenCreateOfficial}
      />

      {/* Ventana Emergente Pequeña de Feedback (1 vez por hora mediante Cookies Generales + Cache) */}
      <HourlyFeedbackPopup />
    </div>
  );
}

export default function App() {
  return (
    <TournamentProvider>
      <TournamentMain />
    </TournamentProvider>
  );
}
