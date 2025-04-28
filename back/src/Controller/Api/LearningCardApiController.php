<?php

namespace App\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\LearningCardRepository;
use Symfony\Component\Routing\Annotation\Route;
use App\Entity\LearningCard;

#[Route('/api/learning_cards_api/', name: 'api_learning_cards', methods: ['GET'])]
class LearningCardApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private LearningCardRepository $learningCardRepository
    )
    {
    }
    
    #[Route('filter', name: 'filter', methods: ['GET'])]
    public function getThemesAndNiveaux(): JsonResponse
    {
        $themes = $this->learningCardRepository->createQueryBuilder('c')
                ->select('DISTINCT c.theme')
                ->getQuery()
                ->getResult();

        $niveaux = $this->learningCardRepository->createQueryBuilder('c')
            ->select('DISTINCT c.niveau')
            ->getQuery()
            ->getResult();

        return new JsonResponse([
            'themes' => array_map(fn($item) => ['theme' => $item['theme']], $themes),
            'niveaux' => array_map(fn($item) => ['niveau' => $item['niveau']], $niveaux),
        ]);
    }

    #[Route('cards', name: 'cards', methods: ['GET'])]
    public function getCards(): JsonResponse
    {
        $cards = $this->learningCardRepository->findAll();
        return $this->formatCardsResponse($cards);
    }

    #[Route('cards/theme/{theme}', name: 'cards_by_theme', methods: ['GET'])]
    public function getCardsByTheme(string $theme): JsonResponse
    {
        $cards = $this->learningCardRepository->findByTheme(urldecode($theme));
        return $this->formatCardsResponse($cards);
    }

    #[Route('cards/niveau/{niveau}', name: 'cards_by_niveau', methods: ['GET'])]
    public function getCardsByNiveau(string $niveau): JsonResponse
    {
        $cards = $this->learningCardRepository->findByNiveau(urldecode($niveau));
        return $this->formatCardsResponse($cards);
    }

    #[Route('cards/filter', name: 'cards_filtered', methods: ['GET'])]
    public function getFilteredCards(?string $theme = null, ?string $niveau = null): JsonResponse
    {
        $qb = $this->learningCardRepository->createQueryBuilder('c');

        if ($theme) {
            $qb->andWhere('c.theme = :theme')
               ->setParameter('theme', urldecode($theme));
        }

        if ($niveau) {
            $qb->andWhere('c.niveau = :niveau')
               ->setParameter('niveau', urldecode($niveau));
        }

        $cards = $qb->getQuery()->getResult();
        return $this->formatCardsResponse($cards);
    }

    private function formatCardsResponse(array $cards): JsonResponse
    {
        $formattedCards = array_map(function (LearningCard $card) {
            return [
                'id' => $card->getId(),
                'theme' => $card->getTheme(),
                'niveau' => $card->getNiveau(),
                'info' => $card->getInfo(),
                'reference' => $card->getReference(),
                'pdfUrl' => $card->getReferenciel()?->getPdfUrl(),
            ];
        }, $cards);

        return new JsonResponse([
            '@context' => '/api/contexts/LearningCard',
            '@id' => '/api/learning_cards_api/cards',
            '@type' => 'hydra:Collection',
            'totalItems' => count($formattedCards),
            'member' => $formattedCards,
        ]);
    }
}